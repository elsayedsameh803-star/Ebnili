import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Users,
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  loadOwnerStats,
  loadActivityLog,
  setTransactionStatus,
  setSubscriptionStatus,
  loadUsersWithSubscriptions,
} from '@/lib/admin';
import type { OwnerStats, ActivityEntry } from '@/lib/admin';
import type { Transaction } from '@/lib/types';
import { ORANGE_CASH_NUMBER } from '@/lib/types';

type Tab = 'overview' | 'transactions' | 'users' | 'activity';

const currency = (n: number) => `${Number(n).toLocaleString('en')} EGP`;

export default function AdminDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof loadUsersWithSubscriptions>>>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await loadOwnerStats();
      setStats(s);
      setTransactions(s.recentTransactions);
      setUsers(await loadUsersWithSubscriptions());
      setActivity(await loadActivityLog());
    } catch (e) {
      console.error('Admin load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markVerified = async (id: string) => {
    setSavingId(id);
    await setTransactionStatus(id, 'verified');
    await refresh();
    setSavingId(null);
  };

  const markRejected = async (id: string) => {
    setSavingId(id);
    await setTransactionStatus(id, 'rejected');
    await refresh();
    setSavingId(null);
  };

  const handleSubscription = async (userId: string, next: 'active' | 'cancelled') => {
    setSavingId(userId);
    await setSubscriptionStatus(userId, next);
    await refresh();
    setSavingId(null);
  };

    return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} /> لوحة مالك المنتج
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              قبول المدفوعات عبر أورانج كاش:{' '}
              <span className="font-medium text-slate-700">{ORANGE_CASH_NUMBER}</span>
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stat cards (overview) */}
        {stats && tab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <StatCard icon={<Users size={18} />} label="المستخدمات" value={stats.totalUsers} loading={loading} />
            <StatCard
              icon={<Users size={18} />}
              label="اشتراكات نشطة"
              value={stats.activeSubscriptions}
              sub={`${stats.starterCount} ستارتر / ${stats.proCount} برو`}
              loading={loading}
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="الإيرادات"
              value={currency(stats.totalRevenueEGP)}
              sub={`${stats.verifiedCount} مدفوعة`}
              loading={loading}
            />
            <StatCard icon={<AlertTriangle size={18} />} label="معلقة" value={stats.pendingCount} loading={loading} />
            <StatCard icon={<CheckCircle size={18} />} label="موثقة" value={stats.verifiedCount} loading={loading} />
            <StatCard icon={<Clock size={18} />} label="مشاريع إجمالاً" value={stats.totalProjects} loading={loading} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 text-xs">
          {([
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'transactions', label: 'المعاملات' },
            { id: 'users', label: 'المستخدمين' },
            { id: 'activity', label: 'النشاط' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
                  {tab === 'transactions' && (
            <TxTable
              items={transactions}
              loading={loading}
              onVerify={markVerified}
              onReject={markRejected}
              savingId={savingId}
            />
          )}
          {tab === 'users' && (
            <UserTable
              items={users}
              loading={loading}
              onSubscription={handleSubscription}
              savingId={savingId}
            />
          )}
          {tab === 'activity' && <ActivityList items={activity} loading={loading} />}
          {tab === 'overview' && stats && (
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h2 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <CreditCard size={14} /> آخر المعاملات
                </h2>
                <TxTable
                  items={stats.recentTransactions}
                  loading={loading}
                  onVerify={markVerified}
                  onReject={markRejected}
                  savingId={savingId}
                  compact
                />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h2 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={14} /> النشاط الأخير
                </h2>
                <ActivityList items={activity} loading={loading} compact />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-50 text-slate-600 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900 truncate">{loading ? '—' : value}</p>
                {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function TxTable({
  items,
  loading,
  onVerify,
  onReject,
  savingId,
  compact = false,
}: {
    items: (Transaction & { user_email?: string | null })[];
  loading?: boolean;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  savingId: string | null;
  compact?: boolean;
}) {
  if (!items.length) {
    return (
      <p className="text-xs text-slate-400 py-4 text-center">
        لا توجد معاملات.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-xs ${compact ? 'table-fixed' : ''}`}>
        <thead>
          <tr className="text-right text-slate-500 border-b border-slate-200">
            <th className="pb-2">المبلغ</th>
            <th className="pb-2">الباقة</th>
            <th className="pb-2">الحالة</th>
            {!compact && <th className="pb-2">المستخدم</th>}
            <th className="pb-2 text-center">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((tx) => (
            <tr key={tx.id} className="border-b border-slate-100 align-top">
              <td className="py-2">{currency(Number(tx.amount) || 0)}</td>
              <td className="py-2">{tx.tier}</td>
              <td className="py-2 capitalize">{tx.status}</td>
              {!compact && (
                <td className="py-2 truncate max-w-[180px]" title={tx.user_email ?? ''}>
                  {tx.user_email ?? tx.user_id ?? '—'}
                </td>
              )}
              <td className="py-2">
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => onVerify(tx.id)}
                    disabled={tx.status === 'verified' || savingId === tx.id}
                    className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-40"
                    title="توثيق"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    onClick={() => onReject(tx.id)}
                    disabled={tx.status === 'verified' || savingId === tx.id}
                    className="p-1 rounded text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                    title="رفض"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
                </tbody>
      </table>
    </div>
  );
}

function UserTable({
  items,
  loading,
  onSubscription,
  savingId,
}: {
  items: Awaited<ReturnType<typeof loadUsersWithSubscriptions>>;
  loading?: boolean;
  onSubscription: (userId: string, next: 'active' | 'cancelled') => void;
  savingId: string | null;
}) {
  if (!items.length) {
    return <p className="text-xs text-slate-400 py-4 text-center">لا يوجد مستخدمون.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-right text-slate-500 border-b border-slate-200">
            <th className="pb-2">البريد</th>
            <th className="pb-2">الهاتف</th>
            <th className="pb-2">الباقة</th>
            <th className="pb-2">الحالة</th>
            <th className="pb-2 text-center">الدور</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-2 truncate max-w-[180px]">{u.email ?? '—'}</td>
              <td className="py-2">{u.phone ?? '—'}</td>
              <td className="py-2">{u.tier ?? '—'}</td>
              <td className="py-2 capitalize">{u.status ?? '—'}</td>
              <td className="py-2 text-center">
                {u.role === 'owner' ? (
                  <span className="text-[10px] text-emerald-600 font-medium">مالك</span>
                ) : (
                  <button
                    onClick={() => onSubscription(u.id, 'active')}
                    disabled={savingId === u.id}
                    className="text-[10px] text-orange-600 hover:underline disabled:opacity-50"
                    title="تفعيل اشتراك"
                  >
                    تفعيل
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityList({
  items,
  loading,
  compact = false,
}: {
  items: ActivityEntry[];
  loading?: boolean;
  compact?: boolean;
}) {
  if (!items.length) {
    return <p className="text-xs text-slate-400 py-4 text-center">لا يوجد نشاط.</p>;
  }
  return (
    <div className={`space-y-2 ${compact ? 'max-h-64' : 'max-h-[480px]'} overflow-y-auto`}>
      {items.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 text-xs">
          <ChevronRight size={12} className="text-slate-400 rotate-90 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-slate-800">{a.action}</span>
            {a.details && Object.keys(a.details).length > 0 && (
              <pre className="mt-0.5 text-[10px] text-slate-500 whitespace-pre-wrap break-all">
                {JSON.stringify(a.details)}
              </pre>
            )}
            <span className="block text-[10px] text-slate-400 mt-0.5">
              {new Date(a.created_at).toLocaleString('ar-EG')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
