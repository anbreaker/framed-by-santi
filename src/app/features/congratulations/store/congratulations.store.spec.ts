import { TestBed } from '@angular/core/testing';

import { CongratulationsStore } from './congratulations.store';

const mocks = vi.hoisted(() => ({
  deleteDoc: vi.fn(),
  getDb: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@features/auth/services/firebase-client', () => ({ getFirebaseDb: mocks.getDb }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  deleteDoc: mocks.deleteDoc,
  doc: (parent: { name?: string }, name?: string, id?: string) =>
    name === undefined ? { id: 'new-id', name: parent.name } : { id, name },
  getDocs: mocks.getDocs,
  setDoc: mocks.setDoc,
}));

const snapshot = (documents: { data: unknown; id: string }[]): unknown => ({
  docs: documents.map((document) => ({ data: () => document.data, id: document.id })),
});

describe('CongratulationsStore', () => {
  let store: CongratulationsStore;

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getDb.mockReturnValue({});
    mocks.getDocs.mockResolvedValue(snapshot([]));
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(5000);
    store = TestBed.inject(CongratulationsStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load the messages oldest first, skipping documents it cannot show', async () => {
    mocks.getDocs.mockResolvedValue(
      snapshot([
        { data: { createdAt: 2, from: 'Bruno', media: null, message: 'Two' }, id: 'b' },
        { data: { from: 'Broken' }, id: 'x' },
        { data: { createdAt: 1, from: 'Ana', media: null, message: 'One' }, id: 'a' },
      ])
    );

    await store.load();

    expect(store.status()).toBe('ready');
    expect(store.items().map((item) => item.id)).toEqual(['a', 'b']);
    expect(mocks.getDocs).toHaveBeenCalledWith({ name: 'congratulations' });
  });

  it('should say when the messages cannot be read', async () => {
    mocks.getDocs.mockRejectedValue(new Error('permission-denied'));

    await store.load();

    expect(store.status()).toBe('failed');
    expect(store.items()).toEqual([]);
  });

  it('should say when Firebase is not configured', async () => {
    mocks.getDb.mockReturnValue(null);

    await store.load();

    expect(store.status()).toBe('failed');
  });

  it('should save a new message with a fresh id and the time it was created, at the end of the list', async () => {
    mocks.getDocs.mockResolvedValue(
      snapshot([{ data: { createdAt: 1, from: 'Ana', media: null, message: 'One' }, id: 'a' }])
    );
    await store.load();

    const saved = await store.save({ from: 'Bruno', message: 'Two' });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { id: 'new-id', name: 'congratulations' },
      { createdAt: 5000, from: 'Bruno', media: null, message: 'Two' }
    );
    expect(saved).toEqual({ createdAt: 5000, from: 'Bruno', id: 'new-id', message: 'Two' });
    expect(store.items().map((item) => item.id)).toEqual(['a', 'new-id']);
  });

  it('should update a message in place, keeping when it was created', async () => {
    mocks.getDocs.mockResolvedValue(
      snapshot([{ data: { createdAt: 1, from: 'Ana', media: null, message: 'One' }, id: 'a' }])
    );
    await store.load();
    const media = { kind: 'youtube' as const, video: 'dQw4w9WgXcQ' };

    await store.save({ from: 'Ana B.', media, message: 'Edited' }, 'a');

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { id: 'a', name: 'congratulations' },
      { createdAt: 1, from: 'Ana B.', media, message: 'Edited' }
    );
    expect(store.items()).toEqual([
      { createdAt: 1, from: 'Ana B.', id: 'a', media, message: 'Edited' },
    ]);
  });

  it('should leave the list as it was when saving fails', async () => {
    mocks.setDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(store.save({ from: 'Bruno', message: 'Two' })).rejects.toMatchObject({
      reason: 'request-failed',
    });
    expect(store.items()).toEqual([]);
  });

  it('should delete a message and take it out of the list', async () => {
    mocks.getDocs.mockResolvedValue(
      snapshot([{ data: { createdAt: 1, from: 'Ana', media: null, message: 'One' }, id: 'a' }])
    );
    await store.load();

    await store.remove('a');

    expect(mocks.deleteDoc).toHaveBeenCalledWith({ id: 'a', name: 'congratulations' });
    expect(store.items()).toEqual([]);
  });

  it('should keep the message when deleting fails', async () => {
    mocks.getDocs.mockResolvedValue(
      snapshot([{ data: { createdAt: 1, from: 'Ana', media: null, message: 'One' }, id: 'a' }])
    );
    await store.load();
    mocks.deleteDoc.mockRejectedValue(new Error('offline'));

    await expect(store.remove('a')).rejects.toMatchObject({ reason: 'request-failed' });
    expect(store.items()).toHaveLength(1);
  });
});
