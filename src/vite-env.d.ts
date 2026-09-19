/// <reference types="vite/client" />

/**
 * Explicit type for the Gemini API key that is exposed to the browser.
 * Vite inlines any `VITE_*` variable into `import.meta.env`, so this key
 * is public by design (it only powers browser-side content generation).
 */
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string | undefined;
}

