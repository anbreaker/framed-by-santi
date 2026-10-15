import { TestBed } from '@angular/core/testing';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';

import { PostsAdminError, PostsAdminService } from './posts-admin.service';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDb: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: (_db: unknown, name: string) => ({ name }),
  deleteDoc: mocks.deleteDoc,
  doc: (_db: unknown, name: string, id: string) => ({ id, name }),
  getDocs: mocks.getDocs,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
}));

const post: PhotoPost = {
  caption: 'Cyclist',
  id: '',
  photos: [{ alt: 'A', height: 10, id: 'p/1', width: 20 }],
  tags: [],
  takenAt: '2026-10-02',
};

describe('PostsAdminService', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getDb.mockReturnValue({});
  });

  it('should create a post and return the id Firestore gave it', async () => {
    mocks.addDoc.mockResolvedValue({ id: 'new-1' });

    const id = await TestBed.inject(PostsAdminService).create(post, { hidden: true });

    expect(id).toBe('new-1');
    expect(mocks.addDoc).toHaveBeenCalledWith(
      { name: 'posts' },
      expect.objectContaining({ caption: 'Cyclist', hidden: true })
    );
  });

  it('should stamp the creation time when a post is created, so same-day sets can be ordered', async () => {
    mocks.addDoc.mockResolvedValue({ id: 'new-1' });

    await TestBed.inject(PostsAdminService).create(post, { hidden: true });

    const [, document] = mocks.addDoc.mock.calls[0];
    expect(Number.isNaN(Date.parse(document.createdAt))).toBe(false);
  });

  it('should keep the creation time a post already has when it is saved again', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await TestBed.inject(PostsAdminService).save(
      { ...post, createdAt: '2026-10-01T10:00:00.000Z', id: 'abc' },
      { hidden: false }
    );

    expect(mocks.setDoc.mock.calls[0][1].createdAt).toBe('2026-10-01T10:00:00.000Z');
  });

  it('should stamp the creation time on saving a post that never had one', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await TestBed.inject(PostsAdminService).save({ ...post, id: 'abc' }, { hidden: false });

    expect(Number.isNaN(Date.parse(mocks.setDoc.mock.calls[0][1].createdAt))).toBe(false);
  });

  it('should replace an existing post document on save', async () => {
    mocks.setDoc.mockResolvedValue(undefined);

    await TestBed.inject(PostsAdminService).save({ ...post, id: 'abc' }, { hidden: false });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { id: 'abc', name: 'posts' },
      expect.objectContaining({ hidden: false })
    );
  });

  it('should change only the visibility when hiding or publishing', async () => {
    mocks.updateDoc.mockResolvedValue(undefined);

    await TestBed.inject(PostsAdminService).setHidden('abc', true);

    expect(mocks.updateDoc).toHaveBeenCalledWith({ id: 'abc', name: 'posts' }, { hidden: true });
  });

  it('should list every post, hidden ones included, newest first, skipping invalid documents', async () => {
    const valid = (takenAt: string, hidden: boolean): Record<string, unknown> => ({
      caption: takenAt,
      hidden,
      photos: post.photos,
      tags: [],
      takenAt,
    });
    mocks.getDocs.mockResolvedValue({
      docs: [
        { data: () => valid('2026-01-01', false), id: 'old' },
        { data: () => ({ nope: true }), id: 'broken' },
        { data: () => valid('2026-10-01', true), id: 'draft' },
      ],
    });

    const entries = await TestBed.inject(PostsAdminService).list();

    expect(entries.map((entry) => [entry.post.id, entry.hidden])).toEqual([
      ['draft', true],
      ['old', false],
    ]);
  });

  it('should fail with a typed error when Firebase is not configured', async () => {
    mocks.getDb.mockReturnValue(null);

    await expect(TestBed.inject(PostsAdminService).setHidden('abc', false)).rejects.toMatchObject({
      reason: 'not-configured',
    });
  });

  it('should wrap Firestore failures in the same typed error', async () => {
    mocks.addDoc.mockRejectedValue(new Error('permission-denied'));

    const failure = TestBed.inject(PostsAdminService).create(post, { hidden: false });

    await expect(failure).rejects.toBeInstanceOf(PostsAdminError);
    await expect(failure).rejects.toMatchObject({ reason: 'request-failed' });
  });
});
