import { TestBed } from '@angular/core/testing';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPostsStore } from './photo-posts.store';

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  queryCollection: vi.fn(),
}));

vi.mock('@features/auth/services/firebase-config', () => ({
  isFirebaseConfigured: mocks.configured,
}));
vi.mock('../services/firestore-rest', () => ({ queryCollection: mocks.queryCollection }));

const photo = { alt: 'A', height: 10, id: 'p/1', width: 20 };
const docOf = (id: string, data: unknown): { data: unknown; id: string } => ({ data, id });
const post = (takenAt: string): Record<string, unknown> => ({
  caption: takenAt,
  photos: [photo],
  tags: [],
  takenAt,
});

const create = async (): Promise<PhotoPostsStore> => {
  const store = TestBed.inject(PhotoPostsStore);
  await vi.waitFor(() => expect(mocks.queryCollection).toHaveBeenCalled());
  await Promise.resolve();
  await Promise.resolve();
  return store;
};

describe('PhotoPostsStore with Firestore', () => {
  beforeEach(() => {
    mocks.configured.mockReset();
    mocks.queryCollection.mockReset();
    mocks.configured.mockReturnValue(true);
  });

  it('should put the set created last first when two share a day', async () => {
    mocks.queryCollection.mockResolvedValue([
      docOf('morning', { ...post('2026-10-15'), createdAt: '2026-10-15T08:00:00.000Z' }),
      docOf('evening', { ...post('2026-10-15'), createdAt: '2026-10-15T20:00:00.000Z' }),
      docOf('legacy', post('2026-10-15')),
    ]);

    const store = await create();

    expect(store.posts().map((item) => item.id)).toEqual(['evening', 'morning', 'legacy']);
    expect(store.latestPost()?.id).toBe('evening');
  });

  it('should ask only for visible posts, as the security rules require', async () => {
    mocks.queryCollection.mockResolvedValue([]);

    await create();

    expect(mocks.queryCollection).toHaveBeenCalledWith('posts', { equals: false, field: 'hidden' });
  });

  it('should replace the local posts with the Firestore ones, newest first', async () => {
    mocks.queryCollection.mockResolvedValue([
      docOf('old', post('2026-01-01')),
      docOf('new', post('2026-09-09')),
    ]);

    const store = await create();

    expect(store.posts().map((item) => item.id)).toEqual(['new', 'old']);
    expect(store.latestPost()?.id).toBe('new');
  });

  it('should add the themes created in Firestore to the default ones', async () => {
    const label = { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' };
    mocks.queryCollection.mockImplementation((collectionId: string) =>
      Promise.resolve(
        collectionId === 'themes'
          ? [docOf('sunset', { label }), docOf('broken', { label: 'x' })]
          : [docOf('p1', { ...post('2026-05-05'), tags: ['sunset', 'street'] })]
      )
    );

    const store = await create();
    await vi.waitFor(() =>
      expect(store.themes().some((theme) => theme.id === 'sunset')).toBe(true)
    );

    expect(store.themes().map((theme) => theme.id)).toEqual(
      expect.arrayContaining(['architecture', 'bw', 'night', 'sky', 'street', 'sunset'])
    );
    expect(store.themes().some((theme) => theme.id === 'broken')).toBe(false);
    expect(store.availableThemes().map((theme) => theme.id)).toEqual(['street', 'sunset']);
  });

  it('should skip malformed documents', async () => {
    mocks.queryCollection.mockResolvedValue([
      docOf('bad', { caption: 1 }),
      docOf('good', post('2026-05-05')),
    ]);

    const store = await create();

    expect(store.posts().map((item) => item.id)).toEqual(['good']);
  });

  it('should keep the local posts when Firestore fails', async () => {
    mocks.queryCollection.mockRejectedValue(new Error('offline'));

    const store = await create();

    expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
    expect(store.ready()).toBe(true);
  });

  it('should show nothing, not the local posts, when Firestore answers with no visible set', async () => {
    mocks.queryCollection.mockResolvedValue([]);

    const store = await create();

    expect(store.posts()).toEqual([]);
    expect(store.latestPost()).toBeUndefined();
    expect(store.ready()).toBe(true);
  });

  it('should show nothing when Firestore only has malformed documents', async () => {
    mocks.queryCollection.mockResolvedValue([docOf('bad', {})]);

    const store = await create();

    expect(store.posts()).toEqual([]);
  });

  it('should not show the local posts while Firestore has not answered yet', () => {
    mocks.queryCollection.mockReturnValue(new Promise(() => undefined));

    const store = TestBed.inject(PhotoPostsStore);

    expect(store.posts()).toEqual([]);
    expect(store.ready()).toBe(false);
  });

  it('should not touch Firestore when Firebase is not configured', () => {
    mocks.configured.mockReturnValue(false);

    const store = TestBed.inject(PhotoPostsStore);

    expect(mocks.queryCollection).not.toHaveBeenCalled();
    expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
    expect(store.ready()).toBe(true);
  });

  describe('refresh', () => {
    it('should pick up a set published after the site loaded, newest first', async () => {
      mocks.queryCollection.mockResolvedValue([docOf('old', post('2026-01-01'))]);
      const store = await create();
      expect(store.posts().map((item) => item.id)).toEqual(['old']);

      mocks.queryCollection.mockResolvedValue([
        docOf('old', post('2026-01-01')),
        docOf('new', post('2026-10-01')),
      ]);
      await store.refresh();

      expect(store.posts().map((item) => item.id)).toEqual(['new', 'old']);
      expect(store.latestPost()?.id).toBe('new');
    });

    it('should drop a set that was hidden, and show nothing when none is visible any more', async () => {
      mocks.queryCollection.mockResolvedValue([docOf('only', post('2026-01-01'))]);
      const store = await create();

      mocks.queryCollection.mockResolvedValue([]);
      await store.refresh();

      expect(store.posts()).toEqual([]);
    });

    it('should keep what is shown when the request fails', async () => {
      mocks.queryCollection.mockResolvedValue([docOf('old', post('2026-01-01'))]);
      const store = await create();

      mocks.queryCollection.mockRejectedValue(new Error('offline'));
      await store.refresh();

      expect(store.posts().map((item) => item.id)).toEqual(['old']);
    });

    it('should do nothing when Firebase is not configured', async () => {
      mocks.configured.mockReturnValue(false);
      const store = TestBed.inject(PhotoPostsStore);

      await store.refresh();

      expect(mocks.queryCollection).not.toHaveBeenCalled();
      expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
    });

    it('should let the latest answer win when two refreshes overlap', async () => {
      mocks.queryCollection.mockResolvedValue([docOf('start', post('2026-01-01'))]);
      const store = await create();

      let releaseSlow: (value: unknown) => void = () => undefined;
      mocks.queryCollection.mockImplementationOnce(
        () => new Promise((resolve) => (releaseSlow = resolve))
      );
      mocks.queryCollection.mockResolvedValueOnce([docOf('fresh', post('2026-10-01'))]);

      const slow = store.refresh();
      await store.refresh();
      releaseSlow([docOf('stale', post('2026-05-05'))]);
      await slow;

      expect(store.posts().map((item) => item.id)).toEqual(['fresh']);
    });
  });
});
