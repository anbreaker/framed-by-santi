import { FetchFn, requireAdmin } from './_admin-auth';

const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_TIMEOUT_MS = 10_000;
const MAX_TEXTS = 10;
const MAX_TEXT_LENGTH = 5000;

const LANGS = ['en', 'es', 'pt'] as const;

type Lang = (typeof LANGS)[number];

/** DeepL names the source language with a bare code, but wants a regional variant for English and Portuguese targets. */
const SOURCE_CODE: Record<Lang, string> = { en: 'EN', es: 'ES', pt: 'PT' };
const TARGET_CODE: Record<Lang, string> = { en: 'EN-US', es: 'ES', pt: 'PT-PT' };

export interface TranslateEnv {
  deeplApiKey: string | undefined;
  firebaseProjectId: string | undefined;
}

interface TranslateRequest {
  source: Lang;
  texts: string[];
}

const json = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

const isLang = (value: unknown): value is Lang => LANGS.some((lang) => lang === value);

const readRequest = async (request: Request): Promise<TranslateRequest | null> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  const { source, texts } = (body ?? {}) as { source?: unknown; texts?: unknown };

  const valid =
    isLang(source) &&
    Array.isArray(texts) &&
    texts.length <= MAX_TEXTS &&
    texts.every((text) => typeof text === 'string' && text.length <= MAX_TEXT_LENGTH);

  return valid ? { source, texts: texts as string[] } : null;
};

class DeepLError extends Error {
  constructor(readonly status: number) {
    super(`deepl-${status}`);
  }
}

/** Translates only the non-blank texts in one DeepL call, and puts blanks back in their place. */
const translateAll = async (
  fetchFn: FetchFn,
  apiKey: string,
  source: Lang,
  target: Lang,
  texts: string[]
): Promise<string[]> => {
  const filled = texts.flatMap((text, index) => (text.trim() === '' ? [] : [index]));

  if (filled.length === 0) {
    return texts;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPL_TIMEOUT_MS);

  try {
    const response = await fetchFn(DEEPL_URL, {
      body: JSON.stringify({
        source_lang: SOURCE_CODE[source],
        target_lang: TARGET_CODE[target],
        text: filled.map((index) => texts[index]),
      }),
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new DeepLError(response.status);
    }

    const { translations } = (await response.json()) as { translations?: { text?: unknown }[] };

    if (!Array.isArray(translations) || translations.length !== filled.length) {
      throw new DeepLError(502);
    }

    const result = [...texts];
    filled.forEach((index, position) => {
      const text = translations[position]?.text;

      if (typeof text !== 'string') {
        throw new DeepLError(502);
      }

      result[index] = text;
    });

    return result;
  } finally {
    clearTimeout(timeout);
  }
};

export const handleTranslate = async (
  request: Request,
  env: TranslateEnv,
  fetchFn: FetchFn = fetch
): Promise<Response> => {
  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const { deeplApiKey, firebaseProjectId } = env;

  if (!deeplApiKey || !firebaseProjectId) {
    return json(500, { error: 'not-configured' });
  }

  const denied = await requireAdmin(request, firebaseProjectId, fetchFn);

  if (denied) {
    return denied;
  }

  const input = await readRequest(request);

  if (!input) {
    return json(400, { error: 'invalid-request' });
  }

  const targets = LANGS.filter((lang) => lang !== input.source);

  try {
    const translated = await Promise.all(
      targets.map((target) => translateAll(fetchFn, deeplApiKey, input.source, target, input.texts))
    );
    const translations: Record<Lang, string[]> = { en: [], es: [], pt: [] };

    translations[input.source] = input.texts;
    targets.forEach((target, position) => {
      translations[target] = translated[position];
    });

    return json(200, { translations });
  } catch (error) {
    if (error instanceof DeepLError && error.status === 456) {
      return json(429, { error: 'quota-exceeded' });
    }

    if (error instanceof DeepLError && error.status === 429) {
      return json(429, { error: 'rate-limited' });
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return json(504, { error: 'timeout' });
    }

    return json(502, { error: 'translation-failed' });
  }
};
