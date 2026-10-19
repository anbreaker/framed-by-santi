const DATABASE = 'firebaseLocalStorageDb';
const STORE = 'firebaseLocalStorage';
const USER_KEY_PREFIX = 'firebase:authUser:';

const settle = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });

/**
 * True when Firebase Auth kept a signed-in user on this browser, read straight from its IndexedDB without
 * loading the SDK. The old site loaded Firebase for every visitor, so the database alone proves nothing:
 * only a stored user does. Any doubt counts as no session.
 */
export async function hasStoredFirebaseUser(
  factory: IDBFactory | undefined = globalThis.indexedDB
): Promise<boolean> {
  try {
    if (factory?.databases === undefined) return false;
    // Opening a database that does not exist would create it, so check the list first.
    if (!(await factory.databases()).some((info) => info.name === DATABASE)) return false;

    const db = await settle(factory.open(DATABASE));
    try {
      if (!db.objectStoreNames.contains(STORE)) return false;

      const keys = await settle(db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys());
      return keys.some((key) => typeof key === 'string' && key.startsWith(USER_KEY_PREFIX));
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}
