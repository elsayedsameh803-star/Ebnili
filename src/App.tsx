import { useState, useEffect, useCallback } from 'react';
import { Crown, Sparkles, LayoutPanelLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import PromptInput from '@/components/PromptInput';
import SidePreview from '@/components/SidePreview';
import SubscriptionModal from '@/components/SubscriptionModal';
import TransactionHistory from '@/components/TransactionHistory';
import AdminDashboard from '@/components/AdminDashboard';
import NotificationCenter from '@/components/NotificationCenter';
import { streamGenerate } from '@/lib/generator';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import type { Project, ProjectVersion, Subscription, Template } from '@/lib/types';

function App() {
    const [activeView, setActiveView] = useState<'builder' | 'subscription' | 'transactions' | 'admin'>('builder');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
    const { userId } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [previewCode, setPreviewCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  useEffect(() => {
    loadProjects();
    loadSubscription();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) {
      setProjects(data as Project[]);
    }
  };

  const loadSubscription = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      setSubscription(data as Subscription);
    }
  };

  const loadVersions = useCallback(async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setVersions(data as ProjectVersion[]);
    }
  }, []);

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setStreamStatus('Starting');

    try {
      const code = await streamGenerate(prompt, selectedTemplate || undefined, {
        onStatus: (status) => setStreamStatus(status),
      });

            setPreviewCode(code);

      void logActivity(userId, 'generated', {
        template: selectedTemplate?.id ?? null,
        promptLength: prompt.length,
      });

      const templateType = selectedTemplate?.category || 'landing-page';
      const projectName = prompt.slice(0, 40) + (prompt.length > 40 ? '...' : '');

      const { data: projectData, error: projectErr } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          prompt,
          code,
          template_type: templateType,
        })
        .select()
        .single();

      if (projectErr) throw projectErr;

      const newProject = projectData as Project;
      setActiveProject(newProject);
      setProjects((prev) => [newProject, ...prev]);

      const { error: versionErr } = await supabase
        .from('project_versions')
        .insert({
          project_id: newProject.id,
          version_label: 'v1',
          prompt,
          code,
        });
      if (versionErr) throw versionErr;

      await loadVersions(newProject.id);
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
      setStreamStatus('');
    }
  };

    const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    setPreviewCode(project.code);
    void logActivity(userId, 'project_opened', { project: project.id });
    loadVersions(project.id);
    setActiveView('builder');
  };

  const handleVersionSelect = (version: ProjectVersion) => {
    setPreviewCode(version.code);
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
        setPreviewCode('');
        setVersions([]);
      }
    }
  };

  const handleResetPreview = () => {
    setPreviewCode('');
    setActiveProject(null);
    setVersions([]);
  };

  const handleSubscribed = () => {
    loadSubscription();
  };

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
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

      <div className="flex-1 flex flex-col min-w-0">
        {activeView === 'builder' && (
          <>
            <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" />
                <span className="text-sm font-semibold text-slate-700">
                  {activeProject ? activeProject.name : 'New Project'}
                </span>
                {activeProject && (
                  <span className="text-xs text-slate-400">
                    · {versions.length} version{versions.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
                            <div className="flex items-center gap-2">
                {previewCode && (
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className={`p-1.5 rounded-lg text-xs ${
                      showPreview
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={showPreview ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
                  >
                    <LayoutPanelLeft size={15} />
                  </button>
                )}
                <NotificationCenter />
                {subscription?.status === 'active' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                    <Crown size={13} />
                    {subscription.tier.toUpperCase()}
                  </span>
                ) : (
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Crown size={13} />
                    Upgrade
                  </button>
                )}
              </div>
            </div>

            <PromptInput
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              streamStatus={streamStatus}
              selectedTemplate={selectedTemplate}
              onClearTemplate={() => setSelectedTemplate(null)}
            />

                        {showPreview && (
              <SidePreview
                code={previewCode}
                isLoading={isGenerating}
                onClose={() => setShowPreview(false)}
                onReset={handleResetPreview}
              />
            )}
          </>
        )}

                {activeView === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <AdminDashboard />
          </div>
        )}

        {activeView === 'subscription' && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Subscription</h2>
                <p className="text-xs text-slate-500">Manage your Ebnili plan</p>
              </div>
              <button
                onClick={() => setShowSubModal(true)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
              >
                {subscription?.status === 'active' ? 'Change Plan' : 'Subscribe Now'}
              </button>
            </div>
            <div className="p-6 max-w-2xl mx-auto w-full">
              {subscription?.status === 'active' ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                      <Crown size={26} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {subscription.tier.toUpperCase()} Plan
                      </h3>
                      <p className="text-sm text-slate-500">
                        Active since {new Date(subscription.activated_at || subscription.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="text-sm font-semibold text-green-600">Active</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-400">Mobile</p>
                      <p className="text-sm font-semibold text-slate-700">{subscription.sender_mobile || '—'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Crown size={28} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No Active Subscription</h3>
                  <p className="text-sm text-slate-500 mb-4">Subscribe to unlock unlimited AI app generation and premium features.</p>
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
                  >
                    View Plans
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
      </div>

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
