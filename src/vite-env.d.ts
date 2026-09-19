/// <reference types="vite/client" />

/**
 * Types for the env vars that are exposed to the browser.
 *
 * Vite inlines every `VITE_*` variable into `import.meta.env`, so these values
 * are public by design — this site generates content directly from the browser.
 */
interface ImportMetaEnv {
  /** Gemini API key used in-browser by `@google/genai` (public by design). */
  readonly VITE_GEMINI_API_KEY: string | undefined;
  /** Optional override for the preferred Gemini model id. */
  readonly VITE_GEMINI_MODEL: string | undefined;
  /** Supabase project URL — required for cloud storage mode. */
  readonly VITE_SUPABASE_URL: string | undefined;
  /** Supabase anon key (a long JWT) — required for cloud storage mode. */
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
}

