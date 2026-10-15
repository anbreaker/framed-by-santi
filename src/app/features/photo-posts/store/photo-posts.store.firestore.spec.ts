import { TestBed } from '@angular/core/testing';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPostsStore } from './photo-posts.store';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((...args: unknown[]) => ({ where: args })),
}));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  getDocs: mocks.getDocs,
  query: mocks.query,
  where: mocks.where,
}));

const photo = { alt: 'A', height: 10, id: 'p/1', width: 20 };
const docOf = (id: string, data: unknown): { data: () => unknown; id: string } => ({
  data: () => data,
  id,
});
const post = (takenAt: string): Record<string, unknown> => ({
  caption: takenAt,
  photos: [photo],
  tags: [],
  takenAt,
});

const create = async (): Promise<PhotoPostsStore> => {
  const store = TestBed.inject(PhotoPostsStore);
  await vi.waitFor(() => expect(mocks.getDocs).toHaveBeenCalled());
  await Promise.resolve();
  await Promise.resolve();
  return store;
};

describe('PhotoPostsStore with Firestore', () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.getDocs.mockReset();
    mocks.getDb.mockReturnValue({});
  });

  it('should ask only for visible posts, as the security rules require', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });

    await create();

    expect(mocks.where).toHaveBeenCalledWith('hidden', '==', false);
  });

  it('should replace the local posts with the Firestore ones, newest first', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [docOf('old', post('2026-01-01')), docOf('new', post('2026-09-09'))],
    });

    const store = await create();

    expect(store.posts().map((item) => item.id)).toEqual(['new', 'old']);
    expect(store.latestPost().id).toBe('new');
  });

  it('should skip malformed documents', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [docOf('bad', { caption: 1 }), docOf('good', post('2026-05-05'))],
    });

    const store = await create();

    expect(store.posts().map((item) => item.id)).toEqual(['good']);
  });

  it('should keep the local posts when Firestore fails', async () => {
    mocks.getDocs.mockRejectedValue(new Error('offline'));

    const store = await create();

    expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
  });

  it('should keep the local posts when Firestore has nothing to show yet', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [docOf('bad', {})] });

    const store = await create();

    expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
  });

  it('should not touch Firestore when Firebase is not configured', () => {
    mocks.getDb.mockReturnValue(null);

    const store = TestBed.inject(PhotoPostsStore);

    expect(mocks.getDocs).not.toHaveBeenCalled();
    expect(store.posts()).toBe(LOCAL_PHOTO_POSTS);
  });
});
