import { TestBed } from '@angular/core/testing';

import { PostsAdminService } from './posts-admin.service';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, name: string, id: string) => ({ id, name }),
  getDoc: mocks.getDoc,
}));

const photo = { alt: 'A', height: 10, id: 'p/1', width: 20 };
const snapshot = (data: unknown, exists = true) => ({
  data: () => data,
  exists: () => exists,
  id: 'abc',
});

describe('PostsAdminService.get', () => {
  beforeEach(() => {
    mocks.getDb.mockReset();
    mocks.getDoc.mockReset();
    mocks.getDb.mockReturnValue({});
  });

  it('should read one post with its visibility, hidden ones included', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshot({ caption: 'C', hidden: true, photos: [photo], tags: [], takenAt: '2026-10-01' })
    );

    const entry = await TestBed.inject(PostsAdminService).get('abc');

    expect(entry?.hidden).toBe(true);
    expect(entry?.post).toMatchObject({ caption: 'C', id: 'abc' });
  });

  it('should return null when the post does not exist or cannot be shown', async () => {
    mocks.getDoc.mockResolvedValueOnce(snapshot(undefined, false));
    mocks.getDoc.mockResolvedValueOnce(snapshot({ nope: true }));

    expect(await TestBed.inject(PostsAdminService).get('missing')).toBeNull();
    expect(await TestBed.inject(PostsAdminService).get('broken')).toBeNull();
  });

  it('should fail with a typed error when Firebase is not configured or the read fails', async () => {
    mocks.getDb.mockReturnValue(null);
    await expect(TestBed.inject(PostsAdminService).get('abc')).rejects.toMatchObject({
      reason: 'not-configured',
    });

    mocks.getDb.mockReturnValue({});
    mocks.getDoc.mockRejectedValue(new Error('offline'));
    await expect(TestBed.inject(PostsAdminService).get('abc')).rejects.toMatchObject({
      reason: 'request-failed',
    });
  });
});
