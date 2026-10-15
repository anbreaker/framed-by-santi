import { handleTranslate, TranslateEnv } from './_translate';

const ENV: TranslateEnv = { deeplApiKey: 'deepl-key:fx', firebaseProjectId: 'demo-project' };

const tokenFor = (uid: string): string =>
  `h.${Buffer.from(JSON.stringify({ sub: uid })).toString('base64url')}.s`;

const request = (
  body: unknown,
  options: { method?: string; token?: string | null } = {}
): Request => {
  const { method = 'POST', token = tokenFor('uid-1') } = options;

  return new Request('https://example.test/api/translate', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    method,
  });
};

interface DeepLCall {
  body: { source_lang: string; target_lang: string; text: string[] };
  headers: Record<string, string>;
}

/** A fake network: Firestore answers the admin check, DeepL answers translations. */
const network = (
  options: { admin?: number; deepl?: (call: DeepLCall) => Response | Promise<Response> } = {}
) => {
  const deeplCalls: DeepLCall[] = [];
  const fetchFn = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (url.startsWith('https://firestore.googleapis.com/')) {
      return new Response('{}', { status: options.admin ?? 200 });
    }

    const call: DeepLCall = {
      body: JSON.parse(init?.body as string),
      headers: init?.headers as Record<string, string>,
    };
    deeplCalls.push(call);

    return (
      options.deepl?.(call) ??
      Response.json({
        translations: call.body.text.map((text) => ({ text: `${call.body.target_lang}:${text}` })),
      })
    );
  });

  return { deeplCalls, fetchFn };
};

describe('translate', () => {
  it('should only accept POST', async () => {
    const { fetchFn } = network();

    const response = await handleTranslate(request({}, { method: 'PUT' }), ENV, fetchFn);

    expect(response.status).toBe(405);
  });

  it('should report a missing configuration instead of calling anything', async () => {
    const { fetchFn } = network();

    const response = await handleTranslate(
      request({}),
      { ...ENV, deeplApiKey: undefined },
      fetchFn
    );

    expect(response.status).toBe(500);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should refuse callers without a valid token before spending any DeepL quota', async () => {
    const { deeplCalls, fetchFn } = network();

    const response = await handleTranslate(
      request({ source: 'en', texts: ['Hi'] }, { token: null }),
      ENV,
      fetchFn
    );

    expect(response.status).toBe(401);
    expect(deeplCalls).toEqual([]);
  });

  it('should refuse signed-in users who are not admins', async () => {
    const { deeplCalls, fetchFn } = network({ admin: 404 });

    const response = await handleTranslate(request({ source: 'en', texts: ['Hi'] }), ENV, fetchFn);

    expect(response.status).toBe(403);
    expect(deeplCalls).toEqual([]);
  });

  it.each([
    ['not json', 'nope'],
    ['an unknown source language', { source: 'fr', texts: ['Hi'] }],
    ['texts that are not a list', { source: 'en', texts: 'Hi' }],
    ['a non-text item', { source: 'en', texts: ['Hi', 3] }],
    ['too many texts', { source: 'en', texts: Array.from({ length: 11 }, () => 'x') }],
    ['a text that is too long', { source: 'en', texts: ['x'.repeat(5001)] }],
  ])('should reject %s with 400 and not call DeepL', async (_name, body) => {
    const { deeplCalls, fetchFn } = network();

    const response = await handleTranslate(request(body), ENV, fetchFn);

    expect(response.status).toBe(400);
    expect(deeplCalls).toEqual([]);
  });

  it('should translate into the two other languages, one DeepL call each, keeping order and blanks', async () => {
    const { deeplCalls, fetchFn } = network();

    const response = await handleTranslate(
      request({ source: 'en', texts: ['Hello', '  ', 'World'] }),
      ENV,
      fetchFn
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      translations: {
        en: ['Hello', '  ', 'World'],
        es: ['ES:Hello', '  ', 'ES:World'],
        pt: ['PT-PT:Hello', '  ', 'PT-PT:World'],
      },
    });
    expect(deeplCalls.map((call) => [call.body.source_lang, call.body.target_lang])).toEqual([
      ['EN', 'ES'],
      ['EN', 'PT-PT'],
    ]);
    expect(deeplCalls[0].body.text).toEqual(['Hello', 'World']);
    expect(deeplCalls[0].headers['Authorization']).toBe('DeepL-Auth-Key deepl-key:fx');
  });

  it('should translate Spanish into English (US) and Portuguese', async () => {
    const { deeplCalls, fetchFn } = network();

    await handleTranslate(request({ source: 'es', texts: ['Hola'] }), ENV, fetchFn);

    expect(deeplCalls.map((call) => [call.body.source_lang, call.body.target_lang])).toEqual([
      ['ES', 'EN-US'],
      ['ES', 'PT-PT'],
    ]);
  });

  it('should not call DeepL when every text is blank', async () => {
    const { deeplCalls, fetchFn } = network();

    const response = await handleTranslate(
      request({ source: 'en', texts: ['', ' '] }),
      ENV,
      fetchFn
    );

    expect(response.status).toBe(200);
    expect(deeplCalls).toEqual([]);
  });

  it.each([
    [456, 429, 'quota-exceeded'],
    [429, 429, 'rate-limited'],
    [500, 502, 'translation-failed'],
    [403, 502, 'translation-failed'],
  ])('should map a DeepL %i to %i %s', async (deeplStatus, status, error) => {
    const { fetchFn } = network({ deepl: () => new Response('{}', { status: deeplStatus }) });

    const response = await handleTranslate(request({ source: 'en', texts: ['Hi'] }), ENV, fetchFn);

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it('should fail cleanly when DeepL answers with the wrong number of translations or times out', async () => {
    const wrong = network({ deepl: () => Response.json({ translations: [] }) });
    expect(
      (await handleTranslate(request({ source: 'en', texts: ['Hi'] }), ENV, wrong.fetchFn)).status
    ).toBe(502);

    const slow = network({
      deepl: () => {
        throw new DOMException('aborted', 'AbortError');
      },
    });
    const response = await handleTranslate(
      request({ source: 'en', texts: ['Hi'] }),
      ENV,
      slow.fetchFn
    );
    expect(response.status).toBe(504);
  });
});
