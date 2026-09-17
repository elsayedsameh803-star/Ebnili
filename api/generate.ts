/**
 * Vercel Serverless Function: POST /api/generate
 *
 * Proxies generation requests to the Google Gemini API so that the API key
 * never reaches the browser bundle. The key is read from the server-side
 * `GEMINI_API_KEY` environment variable (NOT a `VITE_` variable on purpose —
 * `VITE_*` values are inlined into the public client bundle).
 *
 * Request  body: { prompt: string, template?: string }
 * Response body: { code: string, model: string }
 */

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Ordered candidates — first one that answers wins.
 *  Verified live against this key: 3.5-flash-lite gives the richest page (~16s),
 *  3.1-flash-lite is the fastest fallback (~5s). The big flash models currently
 *  return 503 "high demand" and can hang for 80s, so they sit last behind a
 *  per-attempt timeout. Pro/image models are outside the free tier (429) and
 *  gemini-2.5-* is retired for new keys (404), so they are not listed. */
const MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

/** Hard cap for one Gemini call. Keeps the function under its maxDuration. */
const ATTEMPT_TIMEOUT_MS = 45000;

/** Wall-clock budget for the whole handler (must stay below maxDuration 60s). */
const TOTAL_DEADLINE_MS = 50000;

const MAX_OUTPUT_TOKENS = 65536;

const SYSTEM_INSTRUCTION = [
  'You are Ebnili (إبنلي), an elite front-end engineer that turns a short product brief into a single, production-ready web page.',
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
function buildUserPrompt(prompt: string, template?: string): string {
  const lines = [`Build a complete web page for this brief:\n\n"""\n${prompt}\n"""`];
  if (template && template !== 'blank') {
    lines.push(`\nUse a "${template}" layout as the structural starting point.`);
  }
  lines.push('\nRemember: reply with the raw HTML document only.');
  return lines.join('\n');
}

/** Removes markdown fences / stray prose that models sometimes add. */
function extractHtml(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    text = fenced[1].trim();
  }

  const start = text.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start > 0) {
    text = text.slice(start);
  }

  const endMatch = text.match(/<\/html\s*>/i);
  if (endMatch && endMatch.index !== undefined) {
    text = text.slice(0, endMatch.index + endMatch[0].length);
  }

  // Models sometimes omit the doctype; without it browsers fall back to
  // quirks mode, which subtly breaks modern layout inside the preview iframe.
  if (!/^<!DOCTYPE/i.test(text)) {
    text = '<!DOCTYPE html>\n' + text;
  }

  return text.trim();
}

/** A usable document must open and close properly, and look like a real page. */
function isUsableDocument(html: string): boolean {
  return (
    /<!DOCTYPE html|<html[\s>]/i.test(html) &&
    /<\/html\s*>/i.test(html) &&
    html.length > 600
  );
}


async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  template?: string,
  timeoutMs = ATTEMPT_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; text?: string; error?: string }> {
  const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(prompt, template) }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, error: detail.slice(0, 500) };
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback && data.promptFeedback.blockReason) {
    return {
      ok: false,
      status: 400,
      error: `Prompt blocked: ${data.promptFeedback.blockReason}`,
    };
  }

  const candidate = data.candidates && data.candidates[0];
  const raw = (candidate?.content?.parts || [])
    .map((part) => part.text || '')
    .join('');

  if (!raw.trim()) {
    return { ok: false, status: 502, error: 'Gemini returned an empty response.' };
  }

  return { ok: true, status: 200, text: raw };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
      code: 'NO_API_KEY',
    });
    return;
  }

  let payload: unknown = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }
  }

  const body = (payload || {}) as { prompt?: unknown; template?: unknown };
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const template = typeof body.template === 'string' ? body.template : undefined;

  if (!prompt) {
    res.status(400).json({ error: 'A non-empty "prompt" is required.' });
    return;
  }
  if (prompt.length > 8000) {
    res.status(413).json({ error: 'Prompt is too long (max 8000 characters).' });
    return;
  }

  const failures: string[] = [];
  const startedAt = Date.now();

  for (const model of MODEL_CANDIDATES) {
    // Keep the whole handler inside its maxDuration: skip a model if there is
    // not enough wall-clock left for it to answer.
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - startedAt);
    if (remaining < 8000) {
      failures.push(`${model}: skipped (deadline reached)`);
      continue;
    }

    try {
      const result = await callGemini(apiKey, model, prompt, template, Math.min(ATTEMPT_TIMEOUT_MS, remaining - 2000));

      if (!result.ok) {
        failures.push(`${model}: ${result.status} ${result.error || ''}`.trim());
        if (result.status === 400 || result.status === 401 || result.status === 403) {
          break;
        }
        continue;
      }

      const html = extractHtml(result.text as string);
      if (!isUsableDocument(html)) {
        failures.push(`${model}: response was incomplete or not an HTML document`);
        continue;
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ code: html, model });
      return;
    } catch (err) {
      failures.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  res.status(502).json({
    error: 'All Gemini model attempts failed.',
    attempts: failures,
  });
}
