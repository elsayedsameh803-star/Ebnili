import { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  Crown,
  Smartphone,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PRICING, ORANGE_CASH_NUMBER, type SubscriptionTier, type Subscription } from '@/lib/types';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
  onSubscribed: () => void;
}

export default function SubscriptionModal({
  open,
  onClose,
  currentSubscription,
  onSubscribed,
}: SubscriptionModalProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pro');
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [senderMobile, setSenderMobile] = useState('');
  const [receiptCode, setReceiptCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep(currentSubscription?.status === 'active' ? 'select' : 'select');
      setSelectedTier(currentSubscription?.tier === 'pro' ? 'pro' : 'pro');
      setSenderMobile('');
      setReceiptCode('');
      setError('');
    }
  }, [open, currentSubscription]);

  if (!open) return null;

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handleSubmitPayment = async () => {
    setError('');
    if (!senderMobile.trim() || senderMobile.trim().length < 10) {
      setError('Please enter a valid sender mobile number (at least 10 digits)');
      return;
    }
    if (!receiptCode.trim() || receiptCode.trim().length < 3) {
      setError('Please enter the transaction receipt/reference code');
      return;
    }

    setSubmitting(true);
    try {
      const price = PRICING[selectedTier].price;

      let subscriptionId = currentSubscription?.id;

      if (currentSubscription) {
        const { error: updateErr } = await supabase
          .from('subscriptions')
          .update({ tier: selectedTier, sender_mobile: senderMobile, status: 'active', activated_at: new Date().toISOString() })
          .eq('id', currentSubscription.id);
        if (updateErr) throw updateErr;
      } else {
        const { data: subData, error: subErr } = await supabase
          .from('subscriptions')
          .insert({
            tier: selectedTier,
            status: 'active',
            sender_mobile: senderMobile,
            activated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (subErr) throw subErr;
        subscriptionId = subData.id;
      }

      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          subscription_id: subscriptionId,
          sender_mobile: senderMobile,
          receipt_code: receiptCode,
          amount: price,
          status: 'verified',
          tier: selectedTier,
          reviewed_at: new Date().toISOString(),
        });
      if (txErr) throw txErr;

      setStep('success');
      onSubscribed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tiers = [
    {
      id: 'starter' as SubscriptionTier,
      name: 'Starter',
      price: PRICING.starter.price,
      icon: Zap,
      features: ['5 AI generations per day', 'Basic templates', 'Mobile + desktop preview', 'Copy code export'],
    },
    {
      id: 'pro' as SubscriptionTier,
      name: 'PRO',
      price: PRICING.pro.price,
      icon: Crown,
      features: ['Unlimited AI generations', 'All premium templates', 'All viewport sizes', 'ZIP export + share', 'Version history', 'Priority support'],
      popular: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Crown size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {step === 'select' && 'Choose Your Plan'}
              {step === 'payment' && 'Orange Cash Payment'}
              {step === 'success' && 'Subscription Active'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'select' && (
          <div className="p-6">
            {currentSubscription?.status === 'active' && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <ShieldCheck size={16} className="text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  Your {currentSubscription.tier.toUpperCase()} plan is active
                </span>
              </div>
            )}
            <div className="space-y-3">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedTier === tier.id;
                const isCurrent = currentSubscription?.tier === tier.id && currentSubscription?.status === 'active';
                return (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all relative ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2.5 right-4 text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-orange-500' : 'bg-slate-100'
                        }`}>
                          <Icon size={20} className={isSelected ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{tier.name}</p>
                          <p className="text-xs text-slate-500">{tier.features.length} features</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{tier.price}</p>
                        <p className="text-[11px] text-slate-500">EGP / month</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <Check size={13} className={isSelected ? 'text-orange-500' : 'text-slate-400'} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isCurrent && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        CURRENT PLAN
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleProceedToPayment}
              className="w-full mt-5 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-orange-500 transition-colors flex items-center justify-center gap-2"
            >
              Continue to Payment
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="p-6">
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={18} />
                <span className="font-semibold text-sm">Orange Cash Transfer</span>
              </div>
              <p className="text-xs text-orange-50 mb-3">Send {PRICING[selectedTier].price} EGP to the wallet number below via Orange Cash, then enter your details.</p>
              <div className="bg-white/20 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-100 uppercase tracking-wider">Send to</p>
                  <p className="text-lg font-bold tracking-wider">{ORANGE_CASH_NUMBER}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-orange-100 uppercase tracking-wider">Amount</p>
                  <p className="text-lg font-bold">{PRICING[selectedTier].price} EGP</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Sender Mobile Number
                </label>
                <input
                  type="tel"
                  value={senderMobile}
                  onChange={(e) => setSenderMobile(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">The Orange Cash number you sent from</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transaction Reference / Receipt Code
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  placeholder="Enter receipt or reference code"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">Found in your Orange Cash transaction confirmation</p>
              </div>
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Submit & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
            <p className="text-sm text-slate-500 mb-1">
              Your <span className="font-semibold text-orange-600">{PRICING[selectedTier].name}</span> subscription is now active.
            </p>
            <p className="text-xs text-slate-400 mb-6">A receipt has been recorded in your transaction history.</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-orange-500 transition-colors"
            >
              Start Building
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
