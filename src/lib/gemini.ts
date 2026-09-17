/**
 * Client-side bridge to the serverless Gemini proxy.
 *
 * The API key lives only in the `GEMINI_API_KEY` server environment variable
 * (see `api/generate.ts`). Nothing Gemini-related is ever inlined into the
 * browser bundle, so there is no `VITE_` variable for the key.
 */

export type GenerateResult = {
  code: string;
  model: string;
  source: 'gemini';
};

export type GenerateFailure = {
  reason: 'no-key' | 'unavailable' | 'blocked' | 'network' | 'unknown';
  message: string;
  detail?: string;
};

type ApiOk = { code: string; model: string };
type ApiErr = { error?: string; code?: string; attempts?: string[] };
type ApiPayload = ApiOk | ApiErr;

const isOkPayload = (p: ApiPayload | null): p is ApiOk =>
  !!p && typeof (p as ApiOk).code === 'string' && typeof (p as ApiOk).model === 'string';


export async function generateWithGemini(
  prompt: string,
  template?: string
): Promise<GenerateResult> {
  let res: Response;

  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, template }),
    });
  } catch (err) {
    const failure: GenerateFailure = {
      reason: 'network',
      message: 'Could not reach the generation service.',
      detail: err instanceof Error ? err.message : String(err),
    };
    throw failure;
  }

  let payload: ApiPayload | null = null;
  try {
    payload = (await res.json()) as ApiPayload;
  } catch {
    payload = null;
  }

  if (res.ok && isOkPayload(payload)) {
    return { code: payload.code, model: payload.model, source: 'gemini' };
  }

  const err = (payload || {}) as ApiErr;
  const reason: GenerateFailure['reason'] =
    err.code === 'NO_API_KEY'
      ? 'no-key'
      : res.status === 400
        ? 'blocked'
        : res.status === 502 || res.status === 503 || res.status === 504
          ? 'unavailable'
          : 'unknown';

  const failure: GenerateFailure = {
    reason,
    message: err.error || `Generation service returned HTTP ${res.status}.`,
    detail: (err.attempts || []).join(' | ') || undefined,
  };
  throw failure;
}
