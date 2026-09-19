import { isSupabaseConfigured, supabase } from './supabase';
import type { Subscription, Transaction } from './types';

export const ORANGE_CASH_NUMBER = import.meta.env.VITE_ORANGE_CASH_NUMBER ?? '01207782741';

const LOCAL_USER_KEY = 'ebnili.local_user_id';
const LOCAL_SUBSCRIPTION_KEY = 'ebnili.subscription';

/** Reads the subscription cached in this browser (local/offline mode). */
function getCachedSubscription(): Subscription | null {
  try {
    const raw = localStorage.getItem(LOCAL_SUBSCRIPTION_KEY);
    return raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    return null;
  }
}

/** Stores a subscription in this browser and returns it (local/offline mode). */
function cacheSubscriptionLocally(subscription: Subscription): Subscription {
  try {
    localStorage.setItem(LOCAL_SUBSCRIPTION_KEY, JSON.stringify(subscription));
  } catch {
    /* ignore quota / private-mode errors */
  }
  return subscription;
}

function localId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}_` + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Build a stable-ish device fingerprint from browser signals.
 * Used to stop abuse of the free-tier credit across multiple accounts.
 */
export function getDeviceFingerprint(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const scr = typeof screen !== 'undefined' ? screen : undefined;
  const components = [
    nav?.userAgent ?? '',
    nav?.language ?? '',
    String(nav?.hardwareConcurrency ?? ''),
    String(nav?.maxTouchPoints ?? ''),
    scr ? `${scr.width}x${scr.height}` : '',
    String(scr?.colorDepth ?? ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
  ];
  const raw = components.join('||');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export function getLocalUserId(): string {
  let id = localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LOCAL_USER_KEY, id);
  }
  return id;
}

export function setLocalUserEmail(email: string): void {
  localStorage.setItem('ebnili.user_email', email.trim().toLowerCase());
}

export function getLocalUserEmail(): string {
  return localStorage.getItem('ebnili.user_email') ?? '';
}

/**
 * Make sure a row exists in public.users for the local identity,
 * and attach the current device fingerprint to that user.
 */
export async function ensureUser(email?: string): Promise<string> {
  const id = getLocalUserId();
  const mail = email ?? getLocalUserEmail();

  // Local mode: with invalid/absent Supabase credentials every request fails
  // (the historical 404/401 noise), so the local id is authoritative.
  if (!isSupabaseConfigured) return id;

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (existing) {
    if (mail) {
      await supabase
        .from('users')
        .update({ email: mail, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  } else {
    const { error } = await supabase.from('users').insert({
      id,
      email: mail || null,
      role: 'user',
    });
    if (error) console.warn('ensureUser insert failed:', error);
  }

  await recordDeviceFingerprint(id);
  return id;
}

export async function recordDeviceFingerprint(userId?: string): Promise<{
  fingerprint: string;
  existingUserIds: string[];
  isNewDevice: boolean;
}> {
  const fp = getDeviceFingerprint();
  const existingUserIds: string[] = [];
  let isNewDevice = false;

  if (!isSupabaseConfigured) {
    return { fingerprint: fp, existingUserIds, isNewDevice: true };
  }

  const { data } = await supabase
    .from('device_fingerprints')
    .select('id, user_id')
    .eq('fingerprint', fp)
    .maybeSingle();

  if (!data) {
    const { error } = await supabase.from('device_fingerprints').insert({
      fingerprint: fp,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      user_id: userId ?? null,
    });
    if (error) console.warn('fingerprint insert failed:', error);
    isNewDevice = true;
  } else {
    await supabase
      .from('device_fingerprints')
      .update({ last_seen: new Date().toISOString(), user_id: userId ?? data.user_id })
      .eq('id', data.id);
    if (data.user_id) existingUserIds.push(data.user_id);
        isNewDevice = !data.user_id;
  }

  return { fingerprint: fp, existingUserIds, isNewDevice };
}

/**
 * Returns an Arabic error message when the free-tier credit looks abused,
 * or null when everything is fine.
 */
export async function checkFreeTierAbuse(userId: string): Promise<string | null> {
  // Device-fingerprint checks need the cloud tables; local mode cannot abuse them.
  if (!isSupabaseConfigured) return null;

  const fp = getDeviceFingerprint();

  const { data: fpRecord } = await supabase
    .from('device_fingerprints')
    .select('user_id')
    .eq('fingerprint', fp)
    .maybeSingle();

  if (fpRecord?.user_id && fpRecord.user_id !== userId) {
    return 'هذا الجهاز مسجل بالفعل مع حساب آخر. لا يمكن الاستفادة من الرصيد المجاني بأكثر من حساب على نفس الجهاز.';
  }

  const { data: devices } = await supabase
    .from('device_fingerprints')
    .select('user_id')
    .eq('user_id', userId);

  if (devices && devices.length > 3) {
    return 'تم اكتشاف دخول من أجهزة كثيرة مختلفة على نفس الحساب. تواصل مع الدعم قبل استخدام الرصيد المجاني.';
  }

  return null;
}

/** True when this device has already consumed its free starter credit. */
export async function hasUsedFreeTier(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const fp = getDeviceFingerprint();
  const { data } = await supabase
    .from('device_fingerprints')
    .select('user_id')
    .eq('fingerprint', fp)
    .maybeSingle();

  if (!data?.user_id) return false;
  if (data.user_id === userId) return false;

  const { data: txs } = await supabase
    .from('transactions')
    .select('id')
    .eq('tier', 'starter')
    .eq('status', 'verified');

  return Boolean(txs && txs.length > 0);
}

export async function logActivity(
  userId: string | null,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  // Analytics are best-effort: never let a failed insert surface as an error.
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('activity_log').insert({
    user_id: userId ?? null,
    action,
    details: details ?? null,
  });
  if (error) console.warn('logActivity failed:', error);
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  if (!isSupabaseConfigured) return getCachedSubscription();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Subscription;
}

export interface PurchaseResult {
  subscription: Subscription;
  transaction: Transaction;
}

/**
 * Activate (or renew) a paid plan after an Orange Cash transfer,
 * and record the transaction for the owner dashboard.
 */
export async function activateOrangeCashPlan(
  userId: string,
  tier: 'starter' | 'pro',
  senderMobile: string,
  receiptCode: string,
  amount: number
): Promise<PurchaseResult> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    tier,
    status: 'active',
    sender_mobile: senderMobile,
    activated_at: new Date().toISOString(),
    expires_at: expiresAt,
  } as const;

  // Local mode: keep the plan + receipt in this browser so checkout still works.
  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    const subscription = cacheSubscriptionLocally({
      id: localId('sub'),
      user_id: userId,
      created_at: now,
      ...payload,
    } as Subscription);
    const transaction: Transaction = {
      id: localId('tx'),
      user_id: userId,
      subscription_id: subscription.id,
      sender_mobile: senderMobile,
      receipt_code: receiptCode,
      amount,
      status: 'verified',
      tier,
      created_at: now,
      reviewed_at: now,
    };
    try {
      const raw = localStorage.getItem('ebnili.transactions');
      const rows = raw ? (JSON.parse(raw) as Transaction[]) : [];
      localStorage.setItem('ebnili.transactions', JSON.stringify([transaction, ...rows]));
    } catch {
      /* ignore */
    }
    return { subscription, transaction };
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let subscription: Subscription;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) throw error ?? new Error('failed to update subscription');
    subscription = data as Subscription;
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();
    if (error || !data) throw error ?? new Error('failed to create subscription');
    subscription = data as Subscription;
  }

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      subscription_id: subscription.id,
      sender_mobile: senderMobile,
      receipt_code: receiptCode,
      amount,
      status: 'verified',
      tier,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (txError || !tx) throw txError ?? new Error('failed to record transaction');

  await logActivity(userId, 'orange_cash_payment', {
    tier,
    amount,
    sender_mobile: senderMobile,
    receipt_code: receiptCode,
  });

  return { subscription, transaction: tx as Transaction };
}

/**
 * Grant the one-time free starter credit for this device.
 * Blocked when the same device already had a free credit on another account.
 */
export async function grantFreeTrial(userId: string): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    const cached = getCachedSubscription();
    if (cached?.status === 'active') {
      return { ok: false, message: 'لديك باقة مفعلة بالفعل.' };
    }
    const now = new Date().toISOString();
    cacheSubscriptionLocally({
      id: localId('sub'),
      user_id: userId,
      tier: 'starter',
      status: 'active',
      activated_at: now,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
    } as Subscription);
    return { ok: true, message: 'تم تفعيل الرصيد المجاني لمدة 24 ساعة.' };
  }

  const abuse = await checkFreeTierAbuse(userId);
  if (abuse) return { ok: false, message: abuse };

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status, tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.status === 'active') {
    return { ok: false, message: 'لديك باقة مفعلة بالفعل.' };
  }

  if (existing?.id) {
    await supabase
      .from('subscriptions')
      .update({
        tier: 'starter',
        status: 'active',
        activated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      tier: 'starter',
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  await logActivity(userId, 'free_trial_granted', { fingerprint: getDeviceFingerprint() });
  return { ok: true, message: 'تم تفعيل الرصيد المجاني لمدة 24 ساعة.' };
}


