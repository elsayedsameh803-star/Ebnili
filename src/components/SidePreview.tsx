import { useEffect, useRef, useState } from 'react';
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Link2,
  Download,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';

interface SidePreviewProps {
  code: string;
  isLoading?: boolean;
  onClose?: () => void;
  onReset?: () => void;
  defaultPosition?: 'left' | 'right';
}

type Viewport = 'mobile' | 'tablet' | 'desktop';

const MIN_WIDTH = 320;
const MAX_WIDTH = 1100;

const VIEWPORT_WIDTH: Record<Viewport, number> = {
  mobile: 390,
  tablet: 820,
  desktop: 1280,
};

const EMPTY_DOC = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8fafc;color:#94a3b8}
div{text-align:center}span{font-size:40px;display:block;margin-bottom:8px}
</style></head><body><div><span>🖥️</span>اكتب وصفاً بالأسفل وشوف موقعك هنا لحظياً</div></body></html>`;

export default function SidePreview({
  code,
  isLoading = false,
  onClose,
  onReset,
  defaultPosition = 'right',
}: SidePreviewProps) {
  const [position, setPosition] = useState<'left' | 'right'>(defaultPosition);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [width, setWidth] = useState(560);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const resizing = useRef(false);
  const asideRef = useRef<HTMLDivElement>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2200);
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizing.current) return;
      const raw = position === 'right' ? window.innerWidth - event.clientX : event.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, raw)));
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [position]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const startResize = () => {
    resizing.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify('تم نسخ الكود');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('تعذّر النسخ من المتصفح');
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const hash = encodeURIComponent(btoa(unescape(encodeURIComponent(code))).slice(0, 6000));
    const url = `${window.location.origin}${window.location.pathname}#share=${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      notify('تم نسخ رابط المشاركة');
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      notify('تعذّر إنشاء رابط المشاركة');
    }
  };

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ebnili-site.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('تم تنزيل الموقع');
  };

  const handleOpenExternal = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  };

  const activeWidth = fullscreen ? '100%' : Math.min(VIEWPORT_WIDTH[viewport], width);

  return (
    <aside
      ref={asideRef}
      className={`relative flex flex-col bg-white ${
        fullscreen
          ? 'fixed inset-0 z-[60] w-full'
          : `shrink-0 border-slate-200 ${position === 'right' ? 'border-l' : 'border-r'}`
      }`}
      style={fullscreen ? undefined : { width }}
    >
      <span
        onMouseDown={startResize}
        className={`absolute top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-orange-400 ${
          position === 'right' ? 'left-0' : 'right-0'
        }`}
        title="اسحب لتغيير العرض"
      />

      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPosition(position === 'right' ? 'left' : 'right')}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            title="نقل المعاينة للجانب الآخر"
          >
            {position === 'right' ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
          <span className="text-xs font-bold text-slate-700">المعاينة الحية</span>
          {isLoading && <Loader2 size={13} className="animate-spin text-orange-500" />}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {([
            { key: 'mobile' as Viewport, Icon: Smartphone, label: 'جوال' },
            { key: 'tablet' as Viewport, Icon: Tablet, label: 'تابلت' },
            { key: 'desktop' as Viewport, Icon: Monitor, label: 'كمبيوتر' },
          ]).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              title={label}
              className={`rounded-md p-1.5 transition-colors ${
                viewport === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleCopy}
            disabled={!code}
            title="نسخ الكود"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleShare}
            disabled={!code}
            title="نسخ رابط المشاركة"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            {shared ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
          </button>
          <button
            onClick={handleDownload}
            disabled={!code}
            title="تنزيل ملف HTML"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleOpenExternal}
            disabled={!code}
            title="فتح في تبويب جديد"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            <ExternalLink size={14} />
          </button>
          {onReset && (
            <button
              onClick={onReset}
              disabled={!code}
              title="إعادة توليد"
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'خروج من كامل الشاشة' : 'وضع كامل الشاشة'}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {onClose && !fullscreen && (
            <button
              onClick={onClose}
              title="إخفاء المعاينة"
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>
    </aside>
  );
}