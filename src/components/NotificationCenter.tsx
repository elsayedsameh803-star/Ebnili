import { Bell, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error && data) {
      setNotifications(data as Notification[]);
      if (data.length) setLastFetched(data[data.length - 1].created_at);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => {
    const ts = new Date(n.created_at).getTime();
    const cutoff = Date.now() - 5 * 60 * 1000;
    return ts > cutoff;
  }).length;

  const markAllRead = async () => {
    // no remote marking for now; just close
    setOpen(false);
    setNotifications([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-600" />
                <span className="font-semibold text-slate-800 text-sm">الإشعارات</span>
                <span className="text-[10px] text-slate-400">{notifications.length} أحدث</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                >
                                  تحديد الكل
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-400 text-sm">
                  <CheckCircle size={20} className="mx-auto mb-2 text-slate-300" />
                  <p>لا توجد إشعارات جديدة</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!loading && n.id === notifications[0]?.id ? 'bg-orange-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {n.action.includes('purchased') ? (
                        <AlertCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      )}
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-medium text-slate-800">{n.action}</span>
                        <span className="block text-slate-400 text-[10px] mt-0.5">
                          {new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
              آخر تحديث: {lastFetched ? new Date(lastFetched).toLocaleTimeString('ar-EG') : '—'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
