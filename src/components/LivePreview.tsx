import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import JSZip from 'jszip';

interface LivePreviewProps {
  code: string;
  isLoading?: boolean;
  projectName?: string;
  onReset?: () => void;
  /** Mobile-only: returns from the preview back to the conversation column. */
  onClose?: () => void;
}

type Viewport = 'mobile' | 'tablet' | 'desktop';
type ViewMode = 'preview' | 'code';

/** `null` means "fill the whole pane" (desktop). */
const VIEWPORT_WIDTH: Record<Viewport, number | null> = {
  mobile: 390,
  tablet: 834,
  desktop: null,
};

const EMPTY_DOC = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#fafafa;color:#a3a3a3}
div{text-align:center}span{font-size:42px;display:block;margin-bottom:10px}p{font-size:13px;margin:0}
</style></head><body><div><span>️</span><p>اكتب وصف الموقع وسيظهر هنا لحظيًا</p></div></body></html>`;

/**
 * Bolt.new-style preview pane: device switcher, Preview/Code tabs, reload,
 * open-in-new-tab, ZIP export and a fullscreen toggle — all over a live iframe.
 */
export default function LivePreview({
  code,
  isLoading = false,
  projectName,
  onReset,
  onClose,
}: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => (code?.trim() ? code : EMPTY_DOC), [code]);
  const lineCount = useMemo(() => (code ? code.split('\n').length : 0), [code]);

  // Push the new document into the iframe whenever the code (or reload key) changes.
  useEffect(() => {
    if (iframeRef.current) iframeRef.current.srcdoc = srcDoc;
  }, [srcDoc, reloadKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenExternal = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = async () => {
    if (!code) return;
    const zip = new JSZip();
    zip.file('index.html', code);
    zip.file(
      'README.md',
      `# ${projectName || 'Ebnili project'}\n\nGenerated with Ebnili (AI website builder).\n\nOpen \`index.html\` in any browser — the page is fully standalone.\n`
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(projectName || 'ebnili-project').replace(/[^\w\u0600-\u06FF-]+/g, '-')}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deviceWidth = VIEWPORT_WIDTH[viewport];

  return (
    <section
      className={`flex min-w-0 flex-col bg-neutral-100 ${
        fullscreen ? 'fixed inset-0 z-50' : 'flex-1'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
        {onClose && (
          <button
            onClick={onClose}
            title="رجوع إلى المحادثة"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 lg:hidden"
          >
            <ArrowRight size={15} />
          </button>
        )}
        <div className="flex items-center rounded-lg bg-neutral-100 p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Eye size={13} />
            معاينة
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
              viewMode === 'code'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Code2 size={13} />
            الكود
          </button>
        </div>

        {viewMode === 'preview' && (
          <div className="flex items-center rounded-lg bg-neutral-100 p-0.5">
            {[
              { key: 'mobile' as Viewport, Icon: Smartphone, label: 'جوال 390px' },
              { key: 'tablet' as Viewport, Icon: Tablet, label: 'تابلت 834px' },
              { key: 'desktop' as Viewport, Icon: Monitor, label: 'سطح المكتب' },
            ].map(({ key, Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewport(key)}
                title={label}
                className={`rounded-md p-1.5 transition-all ${
                  viewport === key
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 truncate text-center text-[11px] text-neutral-400">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-orange-600">
              <Loader2 size={11} className="animate-spin" />
              جارٍ بناء موقعك...
            </span>
          ) : code ? (
            <span>{lineCount} سطر · جاهز</span>
          ) : (
            <span>لا يوجد محتوى بعد</span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!code}
            title="إعادة تحميل المعاينة"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!code}
            title="نسخ الكود"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleDownload}
            disabled={!code}
            title="تنزيل المشروع ZIP"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            <Download size={13} />
          </button>
          <button
            onClick={handleOpenExternal}
            disabled={!code}
            title="فتح في تبويب جديد"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            <ExternalLink size={13} />
          </button>
          {onReset && (
            <button
              onClick={onReset}
              title="مشروع جديد"
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? 'خروج من كامل الشاشة' : 'كامل الشاشة'}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      {viewMode === 'preview' ? (
        <div className="flex flex-1 items-stretch justify-center overflow-auto bg-neutral-200/60 p-3">
          <div
            className="h-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-[width] duration-300"
            style={deviceWidth ? { width: deviceWidth, maxWidth: '100%' } : { width: '100%' }}
          >
            <iframe
              key={reloadKey}
              ref={iframeRef}
              title="Live preview"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-neutral-900">
          <pre className="p-4 font-mono text-[11px] leading-relaxed text-neutral-300">
            <code>{code || '// سيظهر كود الموقع هنا بعد التوليد'}</code>
          </pre>
        </div>
      )}
    </section>
  );
}