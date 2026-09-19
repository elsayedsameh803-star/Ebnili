import { supabase, isSupabaseConfigured } from './supabase';
import { getLocalUserId } from './auth';
import type { Project, ProjectVersion, Subscription, ChatMessage, Transaction } from './types';

/**
 * Dual-mode persistence layer.
 *
 * The 404 users hit while generating was NOT Gemini: `handleGenerate` awaited
 * PostgREST calls and threw as soon as they failed, so a perfectly generated
 * page was discarded whenever Supabase was unconfigured (or its key truncated).
 *
 * Every function below therefore:
 *   1. tries Supabase only when `isSupabaseConfigured` is true,
 *   2. falls back to `localStorage` on ANY failure (missing config, bad key,
 *      missing table, RLS denial, offline, timeout),
 *   3. never throws — the caller always receives usable data.
 */

const KEYS = {
  projects: 'ebnili.projects',
  versions: 'ebnili.project_versions',
  chat: 'ebnili.chat_messages',
  subscription: 'ebnili.subscription',
  transactions: 'ebnili.transactions',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Unique-enough id that works in every browser (no crypto.randomUUID dependency). */
function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLocal<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* quota exceeded / private mode — in-memory state still works */
  }
}

function readLocalObject<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalObject<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** True when the row was created offline and was never synced to Supabase. */
export function isLocalRecord(record: { __local?: boolean } | null | undefined): boolean {
  return Boolean(record?.__local);
}

const REMOTE_TIMEOUT_MS = 8000;

/**
 * Wraps a Supabase call so a hanging/blocked request can never freeze the
 * builder — after the timeout the caller falls back to local storage.
 */
async function withTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error(`Supabase request timed out after ${REMOTE_TIMEOUT_MS}ms`)),
      REMOTE_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

type RemoteResult<T> = { data: T | null; error: unknown };

/** Runs a Supabase query, returning `null` data whenever it is unusable. */
async function tryRemote<T>(run: () => PromiseLike<RemoteResult<T>>): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await withTimeout(run());
    if (error) {
      console.warn('[ebnili] Supabase rejected the request, using local storage:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[ebnili] Supabase request failed, using local storage:', err);
    return null;
  }
}

/* ------------------------------------------------------------------ projects */

export async function listProjects(): Promise<Project[]> {
  const remote = await tryRemote<Project[]>(() =>
    supabase.from('projects').select('*').order('updated_at', { ascending: false })
  );
  if (remote) {
    writeLocal(KEYS.projects, remote);
    return remote;
  }
  return readLocal<Project>(KEYS.projects);
}

export async function saveProject(
  input: Pick<Project, 'name' | 'prompt' | 'code' | 'template_type'>
): Promise<Project | null> {
  const remote = await tryRemote<Project>(() =>
    supabase.from('projects').insert(input).select().single()
  );
  if (remote) {
    writeLocal(KEYS.projects, [remote, ...readLocal<Project>(KEYS.projects)]);
    return remote;
  }

  const now = new Date().toISOString();
  const local = {
    id: createId(),
    ...input,
    created_at: now,
    updated_at: now,
    __local: true,
  } as Project & { __local: boolean };
  writeLocal(KEYS.projects, [local, ...readLocal<Project>(KEYS.projects)]);
  return local;
}

export async function deleteProjectRow(id: string): Promise<void> {
  const rows = readLocal<Project>(KEYS.projects);
  const target = rows.find((p) => p.id === id);
  writeLocal(
    KEYS.projects,
    rows.filter((p) => p.id !== id)
  );
  writeLocal(
    KEYS.versions,
    readLocal<ProjectVersion>(KEYS.versions).filter((v) => v.project_id !== id)
  );

  // Offline-created rows only exist locally, so there is nothing to delete remotely.
  if (!isSupabaseConfigured || isLocalRecord(target as { __local?: boolean } | undefined)) return;
  await tryRemote(() => supabase.from('projects').delete().eq('id', id));
}

/* ----------------------------------------------------------------- versions */

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  const remote = await tryRemote<ProjectVersion[]>(() =>
    supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
  );
  if (remote) return remote;
  return readLocal<ProjectVersion>(KEYS.versions).filter((v) => v.project_id === projectId);
}

export async function saveVersion(
  projectId: string,
  prompt: string,
  code: string,
  label: string
): Promise<ProjectVersion | null> {
  const remote = await tryRemote<ProjectVersion>(() =>
    supabase
      .from('project_versions')
      .insert({ project_id: projectId, version_label: label, prompt, code })
      .select()
      .single()
  );
  if (remote) {
    writeLocal(KEYS.versions, [remote, ...readLocal<ProjectVersion>(KEYS.versions)]);
    return remote;
  }

  const local: ProjectVersion = {
    id: createId(),
    project_id: projectId,
    version_label: label,
    prompt,
    code,
    created_at: new Date().toISOString(),
  };
  writeLocal(KEYS.versions, [local, ...readLocal<ProjectVersion>(KEYS.versions)]);
  return local;
}

/** Counts previous versions of a project so the next label is `v2`, `v3`, ... */
export async function nextVersionLabel(projectId: string): Promise<string> {
  const versions = await listVersions(projectId);
  return `v${versions.length + 1}`;
}

/* --------------------------------------------------------------------- chat */

export function listChatMessages(): ChatMessage[] {
  return readLocal<ChatMessage>(KEYS.chat);
}

export function persistChatMessages(messages: ChatMessage[]): void {
  writeLocal(KEYS.chat, messages);
}

/* ------------------------------------------------------------- subscription */

export async function getSubscription(userId: string | null): Promise<Subscription | null> {
  if (userId) {
    const remote = await tryRemote<Subscription>(() =>
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (remote) {
      writeLocalObject(KEYS.subscription, remote);
      return remote;
    }
  }
  return readLocalObject<Subscription>(KEYS.subscription);
}

export function cacheSubscription(subscription: Subscription | null): void {
  if (subscription) writeLocalObject(KEYS.subscription, subscription);
}

/** Local-mode helper: cache an active subscription for this browser. */
export function saveLocalSubscription(subscription: Subscription): void {
  writeLocalObject(KEYS.subscription, subscription);
}

/** Local-mode helper: append a transaction to the browser cache. */
export function addLocalTransaction(transaction: Transaction): void {
  writeLocal(KEYS.transactions, [transaction, ...readLocal<Transaction>(KEYS.transactions)]);
}

/* ------------------------------------------------------------- transactions */

export async function listTransactions(): Promise<Transaction[]> {
  const remote = await tryRemote<Transaction[]>(() =>
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200)
  );
  if (remote) return remote;
  return readLocal<Transaction>(KEYS.transactions);
}

/* ------------------------------------------------------------------- health */

/** Diagnostics surfaced in the UI so "why is nothing saving?" is never a mystery. */
export function storageDiagnostics(): { cloud: boolean; localUserId: string } {
  return { cloud: isSupabaseConfigured, localUserId: getLocalUserId() };
}
