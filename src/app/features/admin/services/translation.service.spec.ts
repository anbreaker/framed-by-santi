import { TestBed } from '@angular/core/testing';

import { AuthStore } from '@features/auth/store/auth.store';

import { TranslationError, TranslationService } from './translation.service';

const json = (status: number, body: unknown): Response => Response.json(body, { status });

const TRANSLATIONS = { en: ['Hello'], es: ['Hola'], pt: ['Olá'] };

describe('TranslationService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let getIdToken: ReturnType<typeof vi.fn>;
  let service: TranslationService;

  beforeEach(() => {
    fetchFn = vi.fn();
    getIdToken = vi.fn().mockResolvedValue('id-token');
    vi.stubGlobal('fetch', fetchFn);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { getIdToken } }],
    });
    service = TestBed.inject(TranslationService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should send the texts and source language with the ID token and return every language', async () => {
    fetchFn.mockResolvedValue(json(200, { translations: TRANSLATIONS }));

    const result = await service.translate('en', ['Hello']);

    expect(result).toEqual(TRANSLATIONS);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('/api/translate');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer id-token');
    expect(JSON.parse(init.body)).toEqual({ source: 'en', texts: ['Hello'] });
  });

  it('should not call the API when there is nothing to translate', async () => {
    const result = await service.translate('es', []);

    expect(result).toEqual({ en: [], es: [], pt: [] });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should fail as not-allowed without a signed-in user or when the API refuses the token', async () => {
    getIdToken.mockResolvedValueOnce(null);
    await expect(service.translate('en', ['Hi'])).rejects.toMatchObject({ reason: 'not-allowed' });

    fetchFn.mockResolvedValue(json(403, { error: 'forbidden' }));
    await expect(service.translate('en', ['Hi'])).rejects.toMatchObject({ reason: 'not-allowed' });
  });

  it('should tell a quota or rate limit apart from other failures', async () => {
    fetchFn.mockResolvedValue(json(429, { error: 'quota-exceeded' }));
    await expect(service.translate('en', ['Hi'])).rejects.toMatchObject({ reason: 'limit' });

    fetchFn.mockResolvedValue(json(502, { error: 'translation-failed' }));
    await expect(service.translate('en', ['Hi'])).rejects.toMatchObject({ reason: 'failed' });
  });

  it('should fail with a typed error on a network error or an unexpected answer', async () => {
    fetchFn.mockRejectedValue(new Error('offline'));
    await expect(service.translate('en', ['Hi'])).rejects.toBeInstanceOf(TranslationError);

    fetchFn.mockResolvedValue(json(200, { translations: { en: ['x'] } }));
    await expect(service.translate('en', ['Hi'])).rejects.toMatchObject({ reason: 'failed' });
  });
});
