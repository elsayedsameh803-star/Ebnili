import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * Values that ship in `.env.example`. Treating these as "configured" is exactly
 * what made the app look ready while every request failed with a cryptic 404 —
 * so they are rejected explicitly instead of being sent to the network.
 */
const PLACEHOLDER_MARKERS = [
  'your-project-id',
  'your-anon-key',
  'placeholder',
  'example.com',
  'changeme',
  'here',
];

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * A real Supabase anon key is a long JWT (typically 200+ characters). Anything
 * shorter — e.g. a truncated copy that stops at the first dot — is unusable and
 * would make PostgREST answer 401/404 on every call.
 */
const MIN_ANON_KEY_LENGTH = 60;

/**
 * `true` only when both values are present, plausible and not placeholders.
 * When it is `false` the app stays fully usable in local mode (`src/lib/db.ts`)
 * instead of firing requests that are guaranteed to fail.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.') &&
  !looksLikePlaceholder(supabaseUrl) &&
  supabaseAnonKey.length >= MIN_ANON_KEY_LENGTH &&
  !looksLikePlaceholder(supabaseAnonKey);

/** Human-readable reason rendered in the UI when Supabase cannot be used. */
export const supabaseStatusMessage = isSupabaseConfigured
  ? ''
  : 'Supabase غير مُهيأ بشكل صحيح (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). يعمل التطبيق الآن في الوضع المحلي ويحفظ مشاريعك داخل المتصفح.';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
