/**
 * Direct, in-browser bridge to the Gemini API via the official
 * `@google/genai` SDK (v2.x).
 *
 * This is a front-end-only site, so generation happens straight from the
 * browser — there is no server proxy and no `/api/generate` route any more:
 *  - The dev-time Vite server never had an `api/generate.ts` function, so the
 *    old `fetch('/api/generate', ...)` returned 404 during `npm run dev`.
 *  - Vercel deployed that function, which meant dev and production disagreed.
 *  - The retired models it referenced (`gemini-2.0-flash`, `gemini-3.x-flash-lite`)
 *    are shut down / never existed.
 *
 * The API key comes from `VITE_GEMINI_API_KEY`. Every `VITE_`-prefixed variable
 * is statically inlined into the public bundle, so the key IS visible to users —
 * acceptable for a simple front end, and it should be restricted in AI Studio /
 * Google Cloud ("Restrict to Gemini API only" + quotas) since Google blocks keys
 * that it detects as publicly leaked.
 *
 * The public shape (`GenerateResult` / `GenerateFailure`) is preserved so that
 * `generator.ts` and its local-template fallback keep working unchanged.
 */

import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';

export type GenerateResult = {
  code: string;
  model: string;
  source: 'gemini';
};

export type GenerateFailure = {
  reason: 'no-key' | 'unavailable' | 'blocked' | 'network' | 'not-found' | 'unknown';
  message: string;
  detail?: string;
};

/**
 * Gemini model ids, in priority order.
 *
 * Google retires models aggressively (`gemini-2.0-flash` is already shut down),
 * so the preferred model is configurable through `VITE_GEMINI_MODEL` and any
 * retired model (404 / NOT_FOUND) automatically falls through to the next one.
 */
const MODEL_CANDIDATES: readonly string[] = Array.from(
  new Set(
    [import.meta.env?.VITE_GEMINI_MODEL?.trim(), 'gemini-3.8-flash', 'gemini-3.5-flash'].filter(
      (model): model is string => Boolean(model)
    )
  )
);

/** Upper bound on the generated HTML size (a full landing page is ~20k). */
const MAX_OUTPUT_TOKENS = 32000;

const SYSTEM_INSTRUCTION = [
  'You are إبنلي (Ebnili), an elite front-end engineer that turns a short product brief into a single, production-ready web page.',
  '',
  'RULES — follow every one of them:',
  '1. Output ONE complete, standalone HTML5 document.',
  '2. Everything must be inline: <style> in <head>, <script> at the end of <body>. No build step, no external CSS/JS libraries, no imports.',
  '3. Use only system font stacks or Google Fonts loaded over https.',
  '4. The page must be genuinely responsive (media queries + flexible units).',
  '5. Use real, specific, meaningful content that matches the brief — never lorem ipsum, never "Placeholder", never "Your App".',
  '6. Include working interactivity (navigation, forms, toggles, animations) using vanilla JavaScript.',
  '7. Modern, polished visual design: consistent spacing scale, a coherent colour palette, smooth transitions, accessible contrast.',
  '8. Detect the brief\'s language and write ALL visible copy in that language. If the brief is Arabic, set <html lang="ar" dir="rtl"> and use an Arabic-friendly font.',
  '9. Leave no TODOs, no comments asking the user to fill things in, and no truncation.',
  '',
  'OUTPUT FORMAT: reply with the raw HTML document only. Do not wrap it in markdown fences, do not add notes before or after it.',
].join('\n');

const VALID_REASONS: readonly GenerateFailure['reason'][] = [
  'no-key',
  'unavailable',
  'blocked',
  'network',
  'not-found',
  'unknown',
];

function isOurFailure(err: unknown): err is GenerateFailure {
  if (!err || typeof err !== 'object' || !('reason' in err)) return false;
  const reason = (err as { reason?: unknown }).reason;
  return typeof reason === 'string' && (VALID_REASONS as readonly string[]).includes(reason);
}

function buildFailure(
  reason: GenerateFailure['reason'],
  message: string,
  detail?: string
): GenerateFailure {
  return { reason, message, detail };
}



/**
 * Maps a value thrown by the `@google/genai` SDK into the deterministic
 * `GenerateFailure` shape that `generator.ts` relies on for its fallback UI.
 */
function mapGeminiError(err: unknown): GenerateFailure {
  // Our own failure objects are passed through untouched.
  if (isOurFailure(err)) return err;

  const e = (err as {
    status?: string | number;
    code?: string | number;
    message?: string;
    name?: string;
    error?: { code?: number; message?: string };
  }) || null;

  const httpStatus: number | undefined =
    typeof e?.status === 'number'
      ? e.status
      : typeof e?.status === 'string'
      ? Number(e.status)
      : undefined;

  const gcode: number | undefined =
    typeof e?.error?.code === 'number' ? e.error.code
    : typeof e?.code === 'number' ? e.code
    : typeof e?.code === 'string' ? Number(e.code)
    : undefined;

  const statusText = e?.error?.message || e?.message || 'Gemini request failed.';

  let reason: GenerateFailure['reason'] = 'unknown';

  // Google API enum status codes are the authoritative signal (see types.ts).
  // 3 = PERMISSION_DENIED, 7 = PERMISSION_DENIED, 11 = UNAUTHENTICATED,
  // 8 = RESOURCE_EXHAUSTED, 13 = INTERNAL, 14 = UNAVAILABLE.
  if (gcode === 3 || gcode === 7 || gcode === 11) {
    reason = 'no-key';
  } else if (gcode === 9 || gcode === 10) {
    reason = 'blocked'; // FAILED_PRECONDITION (safety/rejected)
  } else if (gcode === 8) {
    reason = 'blocked'; // RESOURCE_EXHAUSTED (rate-limited/safety)
  } else if (gcode === 5) {
    reason = 'not-found'; // NOT_FOUND -> this model id no longer exists
  } else if (gcode === 14) {
    reason = 'unavailable';
  } else if (gcode === 13) {
    reason = 'network'; // INTERNAL -> treat as transport/network
  } else if (httpStatus === 401 || httpStatus === 403) {
    reason = 'no-key';
  } else if (httpStatus === 400 || httpStatus === 429) {
    reason = 'blocked';
  } else if (httpStatus === 404) {
    reason = 'not-found';
  } else if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    reason = 'unavailable';
  }

  return buildFailure(
    reason,
    statusText,
    gcode !== undefined ? `status_code=${gcode}` : undefined
  );
}

let ai: GoogleGenAI | null = null;

/** Lazily creates (and memoizes) the singleton `GoogleGenAI` client. */
function getAi(): GoogleGenAI {
  if (ai) return ai;

  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw buildFailure(
      'no-key',
      'GEMINI_API_KEY غير مُضبوط. أضف VITE_GEMINI_API_KEY إلى .env أو متغيّرات بيئة Vercel.',
      'VITE_GEMINI_API_KEY is empty'
    );
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
}

function buildUserPrompt(prompt: string, template?: string): string {
  const lines = [`Build a complete web page for this brief:\n\n"""\n${prompt}\n"""`];
  if (template && template !== 'blank') {
    lines.push(`\nUse a "${template}" layout as the structural starting point.`);
  }
  lines.push('\nRemember: reply with the raw HTML document only.');
  return lines.join('\n');
}

export async function generateWithGemini(
  prompt: string,
  template?: string
): Promise<GenerateResult> {
  const client = getAi(); // throws a `no-key` GenerateFailure when the key is unset
  const contents = buildUserPrompt(prompt, template);

  let retired: GenerateFailure | undefined;

  for (const model of MODEL_CANDIDATES) {
    let response: GenerateContentResponse;

    try {
      response = await client.models.generateContent({
        model,
        contents,
        config: {
          // NOTE: `systemInstruction` MUST live inside `config` — the SDK's
          // `GenerateContentParameters` only exposes `model`, `contents` and
          // `config`, so a top-level systemInstruction would be ignored.
          // `temperature` is deliberately left at the model default (1.0),
          // which is what Google recommends for Gemini 3 output quality.
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });
    } catch (err) {
      const failure = mapGeminiError(err);
      // A retired model id (404 / NOT_FOUND) is the only failure worth
      // retrying on the next candidate — everything else is a real error.
      if (failure.reason !== 'not-found') throw failure;
      retired = failure;
      continue;
    }

    const code = response.text?.trim() ?? '';

    if (!code) {
      throw buildFailure(
        'blocked',
        'Gemini returned an empty response — likely blocked or safety-filtered.',
        `response.text was empty (model=${model})`
      );
    }

    return { code, model, source: 'gemini' };
  }

  throw (
    retired ??
    buildFailure(
      'unavailable',
      'لا يوجد أي موديل Gemini متاح حاليًا.',
      `tried: ${MODEL_CANDIDATES.join(', ')}`
    )
  );
}

