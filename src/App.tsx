import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Crown, Database, HardDrive, LayoutPanelLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PromptInput from '@/components/PromptInput';
import ChatPanel from '@/components/ChatPanel';
import LivePreview from '@/components/LivePreview';
import SubscriptionModal from '@/components/SubscriptionModal';
import TransactionHistory from '@/components/TransactionHistory';
import AdminDashboard from '@/components/AdminDashboard';
import NotificationCenter from '@/components/NotificationCenter';
import { describeFailure, streamGenerate } from '@/lib/generator';
import { isSupabaseConfigured, supabaseStatusMessage } from '@/lib/supabase';
import {
  cacheSubscription,
  deleteProjectRow,
  getSubscription,
  isLocalRecord,
  listChatMessages,
  listProjects,
  listVersions,
  nextVersionLabel,
  persistChatMessages,
  saveProject,
  saveVersion,
} from '@/lib/db';
import { logActivity } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage, Project, ProjectVersion, Subscription, Template } from '@/lib/types';

type BuilderView = 'builder' | 'subscription' | 'transactions' | 'admin';

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'm_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeMessage(
  role: ChatMessage['role'],
  content: string,
  extra?: Partial<ChatMessage>
): ChatMessage {
  return { id: createMessageId(), role, content, createdAt: new Date().toISOString(), ...extra };
}

function App() {
  const [activeView, setActiveView] = useState<BuilderView>('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { userId } = useAuth();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewCode, setPreviewCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(true);

  // Persist the conversation so a refresh keeps the builder history.
  useEffect(() => {
    if (messages.length) persistChatMessages(messages);
  }, [messages]);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    return message.id;
  }, []);

  const patchMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // Restore the conversation saved in the browser.
  useEffect(() => {
    setMessages(listChatMessages());
  }, []);

  const loadProjects = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  const loadSubscription = useCallback(async () => {
    const sub = await getSubscription(userId);
    setSubscription(sub);
    cacheSubscription(sub);
  }, [userId]);

  const loadVersions = useCallback(async (projectId: string) => {
    setVersions(await listVersions(projectId));
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setStreamStatus('إرسال الوصف إلى Gemini');
    setShowPreviewPane(true);

    pushMessage(makeMessage('user', prompt));

    const assistantId = pushMessage(
      makeMessage('assistant', 'جارٍ بناء موقعك...', { status: 'إرسال الوصف إلى Gemini' })
    );

    const result = await streamGenerate(prompt, selectedTemplate || undefined, {
      onStatus: (status) => {
        setStreamStatus(status);
        patchMessage(assistantId, { status });
      },
    });

    // The preview must always update — even when Gemini failed and the local
    // template kicked in — so this happens before any persistence step.
    setPreviewCode(result.code);
    patchMessage(assistantId, { status: undefined });

    if (result.ok) {
      patchMessage(assistantId, {
        content: `تم توليد الموقع بنجاح عبر ${result.model}.\n\nيمكنك معاينته على اليسار، أو تنزيله كملف ZIP، أو طلب تعديلات بكتابة وصف جديد.`,
      });
    } else {
      patchMessage(assistantId, {
        content: `${describeFailure(result.failure)}\n\nتم استخدام قالب محلي مبدئي حتى تستطيع رؤية النتيجة الآن.`,
        isError: true,
      });
    }

    try {
      const projectName = prompt.slice(0, 48) + (prompt.length > 48 ? '...' : '');
      const templateType = selectedTemplate?.category || 'landing-page';

      const project = await saveProject({
        name: projectName,
        prompt,
        code: result.code,
        template_type: templateType,
      });

      if (project) {
        setActiveProject(project);
        setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);

        const label = await nextVersionLabel(project.id);
        await saveVersion(project.id, prompt, result.code, label);
        await loadVersions(project.id);
      }

      void logActivity(userId, 'generated', {
        template: selectedTemplate?.id ?? null,
        promptLength: prompt.length,
        source: result.source,
      });
    } catch (err) {
      // Persistence problems must never invalidate a successful generation.
      console.warn('[ebnili] project persistence failed:', err);
    } finally {
      setIsGenerating(false);
      setStreamStatus('');
    }
  };

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    setPreviewCode(project.code);
    setShowPreviewPane(true);
    void loadVersions(project.id);
    void logActivity(userId, 'project_opened', { project: project.id });
    setActiveView('builder');
  };

  const handleVersionSelect = (version: ProjectVersion) => {
    setPreviewCode(version.code);
    setShowPreviewPane(true);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectRow(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
      setPreviewCode('');
      setVersions([]);
    }
  };

  const handleResetPreview = () => {
    setPreviewCode('');
    setActiveProject(null);
    setVersions([]);
  };

  const handleSubscribed = () => {
    void loadSubscription();
  };

  const hasPreview = Boolean(previewCode);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={setSelectedTemplate}
        projects={projects}
        activeProject={activeProject}
        onProjectSelect={handleProjectSelect}
        versions={versions}
        onVersionSelect={handleVersionSelect}
        onDeleteProject={handleDeleteProject}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex min-w-0 flex-1">
        {activeView === 'builder' && (
          <>
            {/* Conversation column — mirrors Bolt.new's chat pane */}
            <section
              className={`flex min-w-0 flex-col border-r border-neutral-200 bg-white ${
                showPreviewPane
                  ? 'hidden w-[300px] shrink-0 sm:flex lg:w-[420px]'
                  : 'flex flex-1'
              }`}
            >
              <header className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs font-semibold text-neutral-800">
                    {activeProject ? activeProject.name : 'مشروع جديد'}
                  </span>
                  {activeProject && (
                    <span className="shrink-0 text-[11px] text-neutral-400">
                      · {versions.length} إصدار
                    </span>
                  )}
                  {isLocalRecord(activeProject as { __local?: boolean } | null) && (
                    <span
                      title="محفوظ في المتصفح فقط"
                      className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600"
                    >
                      محلي
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    title={isSupabaseConfigured ? 'متصل بـ Supabase' : supabaseStatusMessage}
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      isSupabaseConfigured
                        ? 'bg-green-50 text-green-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {isSupabaseConfigured ? <Database size={11} /> : <HardDrive size={11} />}
                    {isSupabaseConfigured ? 'سحابي' : 'محلي'}
                  </span>

                  {hasPreview && (
                    <button
                      onClick={() => setShowPreviewPane((v) => !v)}
                      title={showPreviewPane ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
                      className={`rounded-lg p-1.5 transition-colors ${
                        showPreviewPane
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      <LayoutPanelLeft size={15} />
                    </button>
                  )}

                  <NotificationCenter />

                  {subscription?.status === 'active' ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                      <Crown size={12} />
                      {subscription.tier.toUpperCase()}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowSubModal(true)}
                      className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-orange-500"
                    >
                      <Crown size={12} />
                      ترقية
                    </button>
                  )}
                </div>
              </header>

              {!isSupabaseConfigured && (
                <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    {supabaseStatusMessage}
                  </p>
                </div>
              )}

              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                onPickPrompt={handleGenerate}
              />

              <PromptInput
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                streamStatus={streamStatus}
                selectedTemplate={selectedTemplate}
                onClearTemplate={() => setSelectedTemplate(null)}
              />
            </section>

            {showPreviewPane ? (
              <LivePreview
                code={previewCode}
                isLoading={isGenerating}
                projectName={activeProject?.name}
                onReset={handleResetPreview}
                onClose={() => setShowPreviewPane(false)}
              />
            ) : (
              <section className="hidden flex-1 items-center justify-center bg-neutral-50 sm:flex">
                <p className="text-xs text-neutral-400">
                  اضغط على أيقونة اللوحة بالأعلى لإظهار المعاينة
                </p>
              </section>
            )}
          </>
        )}

        {activeView === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <AdminDashboard />
          </div>
        )}

        {activeView === 'subscription' && (
          <div className="flex flex-1 flex-col overflow-y-auto bg-neutral-50">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">الاشتراك</h2>
                <p className="text-xs text-neutral-500">إدارة باقة إبنلي الخاصة بك</p>
              </div>
              <button
                onClick={() => setShowSubModal(true)}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                {subscription?.status === 'active' ? 'تغيير الباقة' : 'اشترك الآن'}
              </button>
            </div>

            <div className="mx-auto w-full max-w-2xl p-6">
              {subscription?.status === 'active' ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500">
                      <Crown size={26} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900">
                        باقة {subscription.tier.toUpperCase()}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        مفعّلة منذ{' '}
                        {new Date(
                          subscription.activated_at || subscription.created_at
                        ).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-neutral-50 p-3">
                      <p className="text-xs text-neutral-400">الحالة</p>
                      <p className="text-sm font-semibold text-green-600">نشطة</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-3">
                      <p className="text-xs text-neutral-400">رقم المحفظة</p>
                      <p className="text-sm font-semibold text-neutral-700">
                        {subscription.sender_mobile || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <Crown size={28} className="text-neutral-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-neutral-900">لا يوجد اشتراك نشط</h3>
                  <p className="mb-4 text-sm text-neutral-500">
                    اشترك للحصول على توليد غير محدود بالذكاء الاصطناعي ومزايا إضافية.
                  </p>
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
                  >
                    عرض الباقات
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'transactions' && (
          <TransactionHistory
            onBack={() => setActiveView('builder')}
            onManageSubscription={() => setShowSubModal(true)}
          />
        )}
      </main>

      <SubscriptionModal
        open={showSubModal}
        onClose={() => setShowSubModal(false)}
        currentSubscription={subscription}
        onSubscribed={handleSubscribed}
      />
    </div>
  );
}

export default App;