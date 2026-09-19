import { isSupabaseConfigured, supabase } from './supabase';
import { getSubscription, listProjects, listTransactions } from './db';
import { getLocalUserId, getLocalUserEmail } from './auth';
import type { Transaction } from './types';

export interface OwnerStats {
  totalUsers: number;
  activeSubscriptions: number;
  starterCount: number;
  proCount: number;
  totalRevenueEGP: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalProjects: number;
  recentTransactions: (Transaction & { user_email?: string | null })[];
}

export interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function loadOwnerStats(): Promise<OwnerStats> {
  // Local mode: report what actually exists in this browser rather than firing
  // four requests that are guaranteed to fail.
  if (!isSupabaseConfigured) {
    const [transactions, projects, subscription] = await Promise.all([
      listTransactions(),
      listProjects(),
      getSubscription(getLocalUserId()),
    ]);

    let totalRevenueEGP = 0;
    let pendingCount = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (tx.status === 'verified') {
        totalRevenueEGP += amount;
        verifiedCount += 1;
      } else if (tx.status === 'pending') {
        pendingCount += 1;
      } else {
        rejectedCount += 1;
      }
    }

    const isActive = subscription?.status === 'active';
    return {
      totalUsers: 1,
      activeSubscriptions: isActive ? 1 : 0,
      starterCount: isActive && subscription?.tier === 'starter' ? 1 : 0,
      proCount: isActive && subscription?.tier === 'pro' ? 1 : 0,
      totalRevenueEGP,
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalProjects: projects.length,
      recentTransactions: transactions.slice(0, 25),
    };
  }

  const [{ data: users }, { data: subs }, { data: txs }, { data: projects }] =
    await Promise.all([
      supabase.from('users').select('id'),
      supabase.from('subscriptions').select('tier, status'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('projects').select('id'),
    ]);

  const list = (txs ?? []) as Transaction[];

  let totalRevenueEGP = 0;
  let pendingCount = 0;
  let verifiedCount = 0;
  let rejectedCount = 0;

  for (const tx of list) {
    const amount = Number(tx.amount) || 0;
    if (tx.status === 'verified') {
      totalRevenueEGP += amount;
      verifiedCount += 1;
    } else if (tx.status === 'pending') {
      pendingCount += 1;
    } else {
      rejectedCount += 1;
    }
  }

  return {
    totalUsers: users?.length ?? 0,
    activeSubscriptions: (subs ?? []).filter((s) => s.status === 'active').length,
    starterCount: (subs ?? []).filter((s) => s.status === 'active' && s.tier === 'starter').length,
    proCount: (subs ?? []).filter((s) => s.status === 'active' && s.tier === 'pro').length,
    totalRevenueEGP,
    pendingCount,
    verifiedCount,
    rejectedCount,
    totalProjects: projects?.length ?? 0,
    recentTransactions: list.slice(0, 25),
  };
}

export async function loadActivityLog(limit = 40): Promise<ActivityEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ActivityEntry[];
}

export async function setTransactionStatus(
  id: string,
  status: 'pending' | 'verified' | 'rejected'
): Promise<void> {
  if (!isSupabaseConfigured) return;

  await supabase
    .from('transactions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
}

export async function setSubscriptionStatus(
  userId: string,
  status: 'active' | 'inactive' | 'expired' | 'cancelled'
): Promise<void> {
  if (!isSupabaseConfigured) return;

  await supabase.from('subscriptions').update({ status }).eq('user_id', userId);
}

export async function loadUsersWithSubscriptions(): Promise<
  {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    created_at: string;
    tier: string | null;
    status: string | null;
  }[]
> {
  // Local mode: there is exactly one user — the one stored in this browser.
  if (!isSupabaseConfigured) {
    const subscription = await getSubscription(getLocalUserId());
    return [
      {
        id: getLocalUserId(),
        email: getLocalUserEmail() || null,
        phone: null,
        role: 'owner',
        created_at: new Date().toISOString(),
        tier: subscription?.tier ?? null,
        status: subscription?.status ?? null,
      },
    ];
  }

  const [{ data: users }, { data: subs }] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('subscriptions').select('user_id, tier, status'),
  ]);

  const byUser = new Map<string, { tier: string; status: string }>();
  for (const s of subs ?? []) {
    if (s.user_id) byUser.set(s.user_id as string, { tier: s.tier, status: s.status });
  }

  return (users ?? []).map((u) => {
    const sub = byUser.get(u.id as string);
    return {
      id: u.id as string,
      email: (u.email as string) ?? null,
      phone: (u.phone as string) ?? null,
      role: (u.role as string) ?? 'user',
      created_at: u.created_at as string,
      tier: sub?.tier ?? null,
      status: sub?.status ?? null,
    };
  });
}