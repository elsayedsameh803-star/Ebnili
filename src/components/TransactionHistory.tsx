import { useEffect, useState } from 'react';
import { Receipt, Check, Clock, X, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PRICING, type Transaction, type TransactionStatus } from '@/lib/types';

interface TransactionHistoryProps {
  onBack: () => void;
  onManageSubscription: () => void;
}

export default function TransactionHistory({ onBack, onManageSubscription }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  const statusConfig: Record<TransactionStatus, { icon: React.ComponentType<{ size?: number | string; className?: string }>; color: string; bg: string; label: string }> = {
    verified: { icon: Check, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Verified' },
    pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending' },
    rejected: { icon: X, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Rejected' },
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">Orange Cash payment records and status</p>
          </div>
        </div>
        <button
          onClick={onManageSubscription}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
        >
          Manage Subscription
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Receipt size={28} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No transactions yet</h3>
            <p className="text-xs text-slate-400 mb-4">Subscribe to a plan to see your payment history here.</p>
            <button
              onClick={onManageSubscription}
              className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
            >
              View Plans
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {transactions.map((tx) => {
              const config = statusConfig[tx.status];
              const StatusIcon = config.icon;
              return (
                <div key={tx.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.bg}`}>
                    <StatusIcon size={18} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {PRICING[tx.tier]?.name || tx.tier.toUpperCase()} Plan
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>
                        {config.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>From: {tx.sender_mobile}</span>
                      <span>·</span>
                      <span>Ref: {tx.receipt_code}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(tx.created_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900">{tx.amount}</p>
                    <p className="text-[11px] text-slate-400">EGP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
