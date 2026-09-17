import { useState, useRef, useEffect } from 'react';
import {
  Home,
  Plus,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  Shield,
} from 'lucide-react';
import type { Project, ProjectVersion, Template } from '@/lib/types';
import { TEMPLATES } from '@/lib/types';

export type SidebarView = 'builder' | 'subscription' | 'transactions' | 'admin';

export interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template | null) => void;
  projects: Project[];
  activeProject: Project | null;
    onVersionSelect: (version: ProjectVersion) => void;
  onDeleteProject: (id: string) => void;
    onProjectSelect: (project: Project) => void;
  versions: ProjectVersion[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const iconForTemplate = (id: string) => {
  switch (id) {
    case 'ecommerce':
      return '🛒';
    case 'saas':
      return '💼';
    case 'portfolio':
      return '👤';
    case 'dashboard':
      return '📊';
    case 'landing':
      return '🚀';
    default:
      return '📄';
  }
};

function Sidebar({
  activeView,
  onViewChange,
  selectedTemplate,
  onTemplateSelect,
  projects,
  activeProject,
    onVersionSelect,
  onProjectSelect,
  versions,
  onDeleteProject,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showAllVersions, setShowAllVersions] = useState(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filteredTemplates = search
    ? TEMPLATES.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : TEMPLATES;

  const navItems: { id: SidebarView; label: string; icon: React.ElementType }[] = [
    { id: 'builder', label: 'المنشئ', icon: Home },
    { id: 'subscription', label: 'الاشتراكات', icon: CreditCard },
    { id: 'transactions', label: 'المعاملات', icon: Receipt },
    { id: 'admin', label: 'لوحة المالك', icon: Shield },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex-shrink-0 flex flex-col h-full bg-slate-900 text-slate-200 border-l border-slate-800 transition-all duration-200`}
    >
      <div className="flex items-center justify-between px-3 h-14 border-b border-slate-800">
        {!collapsed && <span className="font-bold text-xl text-white">ebnili</span>}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="بحث"
              >
                <Search size={15} />
              </button>
              {searchOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-slate-800 rounded-xl border border-slate-700 p-2 shadow-2xl">
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن قالب..."
                    className="w-full px-2 py-1.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  {search && (
                    <div className="mt-1 max-h-40 overflow-y-auto">
                      {filteredTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onTemplateSelect(t);
                            setSearch('');
                            setSearchOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded-lg hover:bg-slate-800 text-right"
                        >
                          <span>{iconForTemplate(t.id)}</span>
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            {collapsed ? (
              <ChevronRight size={16} className="-scale-x-100" />
            ) : (
              <ChevronLeft size={16} className="scale-x-100" />
            )}
          </button>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                activeView === item.id
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={item.label}
            >
              <Icon size={17} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
            {!collapsed && (
        <div className="flex-1 overflow-y-auto pb-4">
          {/* Templates */}
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              قوالب
            </span>
            {selectedTemplate && (
              <button
                onClick={() => onTemplateSelect(null)}
                className="text-slate-500 hover:text-white"
                title="إلغاء القالب"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="space-y-1 px-1">
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTemplateSelect(isSelected ? null : t)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-right ${
                    isSelected
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base">{iconForTemplate(t.id)}</span>
                  <span className="flex-1">{t.name}</span>
                </button>
              );
            })}
          </div>

          {/* Projects */}
          <div className="px-3 mb-2 mt-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              مشاريعي
            </span>
            <button
              onClick={() => onViewChange('builder')}
              className="p-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="مشروع جديد"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="space-y-1 px-1">
            {projects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                لا توجد مشاريع بعد.
              </p>
            ) : (
              projects.map((project) => {
                const isActive = activeProject?.id === project.id;
                return (
                  <div key={project.id} className="flex flex-col">
                    <button
                                            onClick={() => onProjectSelect(project)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-right ${
                        isActive
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      title={project.name}
                    >
                      <span className="truncate">{project.name}</span>
                      <Trash2
                        size={12}
                        className="text-slate-500 hover:text-red-400"
                                                                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                      />
                    </button>
                    {isActive && (
                      <button
                        onClick={() => setVersionsOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-3 pt-1 text-[10px] text-slate-500 hover:text-slate-200"
                        title="إصدارات المشروع"
                      >
                        <ChevronDown
                          size={11}
                          className={`transition-transform ${
                            versionsOpen ? 'rotate-180' : ''
                          }`}
                        />
                        <span>الإصدارات</span>
                      </button>
                    )}
                                        {isActive && versionsOpen && (
                      <div className="pl-4 pr-2 pb-1 space-y-1">
                        {versions
                          .slice(0, showAllVersions ? undefined : 6)
                          .map((v) => (
                          <button
                            key={v.id}
                            onClick={() => onVersionSelect(v)}
                            className="w-full flex flex-col px-2 py-1 text-[10px] rounded-lg text-right text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                            title={v.prompt}
                          >
                            <span className="truncate">
                              {v.version_label ||
                                new Date(v.created_at).toLocaleDateString('en', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                            </span>
                          </button>
                        ))}
                        {versions.length > 6 && !showAllVersions && (
                          <button
                            onClick={() => setShowAllVersions(true)}
                            className="w-full text-[10px] text-slate-500 hover:text-slate-200 py-1"
                          >
                            عرض المزيد
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
