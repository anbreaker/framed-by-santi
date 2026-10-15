import { TestBed } from '@angular/core/testing';

import { AuthStore } from '@features/auth/store/auth.store';

import { PhotoCleanupError, PhotoCleanupService } from './photo-cleanup.service';

const DAY = 24 * 60 * 60 * 1000;
const json = (status: number, body: unknown): Response => Response.json(body, { status });

describe('PhotoCleanupService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let getIdToken: ReturnType<typeof vi.fn>;
  let service: PhotoCleanupService;
  let now: number;

  beforeEach(() => {
    localStorage.clear();
    now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fetchFn = vi.fn().mockResolvedValue(json(200, { deleted: ['a', 'b'], remaining: 0 }));
    getIdToken = vi.fn().mockResolvedValue('id-token');
    vi.stubGlobal('fetch', fetchFn);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { getIdToken } }],
    });
    service = TestBed.inject(PhotoCleanupService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('run', () => {
    it('should ask the API with the ID token and report what was deleted', async () => {
      const result = await service.run();

      expect(result).toEqual({ deleted: 2, remaining: 0 });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('/api/cleanup-photos');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer id-token');
    });

    it('should be able to ask for a dry run', async () => {
      await service.run({ dryRun: true });

      expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ dryRun: true });
    });

    it('should fail with a typed error without a signed-in user or when the API refuses or fails', async () => {
      getIdToken.mockResolvedValueOnce(null);
      await expect(service.run()).rejects.toMatchObject({ reason: 'not-allowed' });

      fetchFn.mockResolvedValue(json(403, { error: 'forbidden' }));
      await expect(service.run()).rejects.toMatchObject({ reason: 'not-allowed' });

      fetchFn.mockResolvedValue(json(502, { error: 'posts-unavailable' }));
      await expect(service.run()).rejects.toBeInstanceOf(PhotoCleanupError);

      fetchFn.mockRejectedValue(new Error('offline'));
      await expect(service.run()).rejects.toMatchObject({ reason: 'failed' });
    });
  });

  describe('runIfDue', () => {
    it('should run the first time, and not again within a day', async () => {
      await service.runIfDue();
      await service.runIfDue();

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should run again once a day has passed, even in a new session', async () => {
      await service.runIfDue();
      now += DAY + 1000;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: AuthStore, useValue: { getIdToken } }],
      });
      await TestBed.inject(PhotoCleanupService).runIfDue();

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should never throw: a failure is swallowed and not retried until the next day', async () => {
      fetchFn.mockRejectedValue(new Error('offline'));

      await expect(service.runIfDue()).resolves.toBeUndefined();
      await service.runIfDue();

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should keep going while there is more to delete, but only a few times', async () => {
      // A new Response each time: a body can only be read once.
      fetchFn.mockImplementation(async () => json(200, { deleted: ['a'], remaining: 50 }));

      await service.runIfDue();

      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('should still run at most once per session when the browser storage is not available', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      await service.runIfDue();
      await service.runIfDue();

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });
});
