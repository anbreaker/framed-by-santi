import { hasStoredFirebaseUser } from './stored-session';

const USER_KEY = 'firebase:authUser:key:[DEFAULT]';

interface FakeOptions {
  databases?: string[] | 'unsupported';
  failOpen?: boolean;
  keys?: string[];
  stores?: string[];
}

const answer = <T>(result: T, fail = false): IDBRequest<T> => {
  const request = { error: fail ? new Error('blocked') : null, result } as unknown as IDBRequest<T>;
  queueMicrotask(() => {
    const handler = fail ? request.onerror : request.onsuccess;
    handler?.call(request, new Event(fail ? 'error' : 'success'));
  });
  return request;
};

function fakeIndexedDb(options: FakeOptions): {
  close: ReturnType<typeof vi.fn>;
  factory: IDBFactory;
  open: ReturnType<typeof vi.fn>;
} {
  const close = vi.fn();
  const stores = options.stores ?? ['firebaseLocalStorage'];
  const db = {
    close,
    objectStoreNames: { contains: (name: string) => stores.includes(name) },
    transaction: () => ({ objectStore: () => ({ getAllKeys: () => answer(options.keys ?? []) }) }),
  };
  const open = vi.fn(() => answer(db, options.failOpen));
  const factory = {
    ...(options.databases !== 'unsupported' && {
      databases: () =>
        Promise.resolve((options.databases ?? []).map((name) => ({ name, version: 1 }))),
    }),
    open,
  } as unknown as IDBFactory;
  return { close, factory, open };
}

describe('hasStoredFirebaseUser', () => {
  it('should find the session of someone who signed in on this browser', async () => {
    const { close, factory } = fakeIndexedDb({
      databases: ['firebaseLocalStorageDb'],
      keys: [USER_KEY],
    });

    await expect(hasStoredFirebaseUser(factory)).resolves.toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it('should find nothing in the empty database the old site left for every visitor', async () => {
    const { factory } = fakeIndexedDb({
      databases: ['firebaseLocalStorageDb'],
      keys: ['firebase:persistence:check'],
    });

    await expect(hasStoredFirebaseUser(factory)).resolves.toBe(false);
  });

  it('should not create the database when it does not exist', async () => {
    const { factory, open } = fakeIndexedDb({ databases: ['something-else'] });

    await expect(hasStoredFirebaseUser(factory)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it.each<[string, FakeOptions]>([
    ['the browser cannot list databases', { databases: 'unsupported' }],
    ['the database cannot be opened', { databases: ['firebaseLocalStorageDb'], failOpen: true }],
    ['the store is missing', { databases: ['firebaseLocalStorageDb'], stores: [] }],
  ])('should find nothing when %s', async (_, options) => {
    await expect(hasStoredFirebaseUser(fakeIndexedDb(options).factory)).resolves.toBe(false);
  });

  it('should find nothing without IndexedDB at all', async () => {
    await expect(hasStoredFirebaseUser(undefined)).resolves.toBe(false);
  });

  it('should give up, finding nothing, when IndexedDB never answers', async () => {
    const factory = {
      databases: () => new Promise(() => undefined),
      open: vi.fn(),
    } as unknown as IDBFactory;

    await expect(hasStoredFirebaseUser(factory, 20)).resolves.toBe(false);
  });
});
