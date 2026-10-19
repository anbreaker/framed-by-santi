import { TestBed } from '@angular/core/testing';

import { getFirebaseAuth, getFirebaseDb } from '../services/firebase-client';
import { hasAdminHint, setAdminHint } from '../utils/admin-hint';
import { AdminSessionStore } from './admin-session.store';
import { AuthStore } from './auth.store';

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

vi.mock('../services/firebase-client', () => ({
  getFirebaseAuth: vi.fn(),
  getFirebaseDb: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  getDoc: vi.fn(),
}));

type AuthCallback = (user: { email: string | null; uid: string } | null) => void;

const fakeAuth = { currentUser: null as { getIdToken: () => Promise<string> } | null };
const fakeDb = {};

let emitAuthState: AuthCallback;

function configureFirebase(): void {
  vi.mocked(getFirebaseAuth).mockReturnValue(fakeAuth as never);
  vi.mocked(getFirebaseDb).mockReturnValue(fakeDb as never);
  vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, callback: AuthCallback) => {
    emitAuthState = callback;
    return () => undefined;
  }) as never);
}

function createStore(): AuthStore {
  return TestBed.inject(AuthStore);
}

describe('AuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fakeAuth.currentUser = null;
    configureFirebase();
  });

  it('should be unavailable and never admin when Firebase is not configured', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(null);
    vi.mocked(getFirebaseDb).mockReturnValue(null);
    const store = createStore();

    await store.whenReady();

    expect(store.status()).toBe('unavailable');
    expect(store.isAdmin()).toBe(false);
    expect(onAuthStateChanged).not.toHaveBeenCalled();
    await expect(store.signIn('a@b.c', 'secret')).rejects.toThrow('Firebase is not configured');
  });

  it('should be signed out when nobody is logged in', async () => {
    const store = createStore();
    expect(store.status()).toBe('loading');

    emitAuthState(null);
    await store.whenReady();

    expect(store.status()).toBe('signed-out');
    expect(store.user()).toBeNull();
    expect(store.isAdmin()).toBe(false);
  });

  it('should be admin when the user has an admins document, reading only their own', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
    const store = createStore();

    emitAuthState({ email: 'santi@example.com', uid: 'uid-1' });
    await store.whenReady();

    expect(store.status()).toBe('signed-in');
    expect(store.user()).toEqual({ email: 'santi@example.com', uid: 'uid-1' });
    expect(store.isAdmin()).toBe(true);
    expect(vi.mocked(getDoc).mock.calls[0]?.[0]).toEqual({ path: 'admins/uid-1' });
  });

  it('should not be admin when the admins document is missing', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    const store = createStore();

    emitAuthState({ email: null, uid: 'stranger' });
    await store.whenReady();

    expect(store.status()).toBe('signed-in');
    expect(store.isAdmin()).toBe(false);
  });

  it('should not be admin, but stay signed in, when the admin check is denied', async () => {
    vi.mocked(getDoc).mockRejectedValue(new Error('permission-denied'));
    const store = createStore();

    emitAuthState({ email: null, uid: 'uid-2' });
    await store.whenReady();

    expect(store.status()).toBe('signed-in');
    expect(store.isAdmin()).toBe(false);
  });

  it('should drop admin rights when the user signs out', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
    const store = createStore();
    emitAuthState({ email: null, uid: 'uid-1' });
    await store.whenReady();

    emitAuthState(null);

    expect(store.status()).toBe('signed-out');
    expect(store.isAdmin()).toBe(false);
  });

  describe('admin hint', () => {
    it('should leave the hint once an admin is confirmed, so the public pages load auth next time', async () => {
      vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
      const store = createStore();

      emitAuthState({ email: null, uid: 'uid-1' });
      await store.whenReady();

      expect(hasAdminHint()).toBe(true);
    });

    it('should clear the hint when the user signs out', async () => {
      setAdminHint(true);
      const store = createStore();

      emitAuthState(null);
      await store.whenReady();

      expect(hasAdminHint()).toBe(false);
    });

    it('should clear the hint for a signed-in user who is not an admin', async () => {
      setAdminHint(true);
      vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
      const store = createStore();

      emitAuthState({ email: null, uid: 'stranger' });
      await store.whenReady();

      expect(hasAdminHint()).toBe(false);
    });
  });

  it('should let the admin session follow it when it is created elsewhere, like the sign in page', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
    const store = createStore();
    const session = TestBed.inject(AdminSessionStore);
    expect(session.isAdmin()).toBe(false);

    emitAuthState({ email: null, uid: 'uid-1' });
    await store.whenReady();

    expect(session.isAdmin()).toBe(true);
  });

  it('should settle the admin check before sign in resolves', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: { email: 'santi@example.com', uid: 'uid-1' },
    } as never);
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as never);
    const store = createStore();
    emitAuthState(null);

    await store.signIn('santi@example.com', 'secret');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      fakeAuth,
      'santi@example.com',
      'secret'
    );
    expect(store.status()).toBe('signed-in');
    expect(store.isAdmin()).toBe(true);
  });

  it('should delegate sign out and password reset to Firebase Auth', async () => {
    const store = createStore();

    await store.sendPasswordReset('santi@example.com');
    await store.signOut();

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(fakeAuth, 'santi@example.com');
    expect(signOut).toHaveBeenCalledWith(fakeAuth);
  });

  it('should return the current ID token, or null when nobody is logged in', async () => {
    const store = createStore();
    expect(await store.getIdToken()).toBeNull();

    fakeAuth.currentUser = { getIdToken: () => Promise.resolve('token-123') };

    expect(await store.getIdToken()).toBe('token-123');
  });
});
