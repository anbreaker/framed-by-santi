import { computed, inject, Injectable, signal } from '@angular/core';

import { getFirebaseAuth, getFirebaseDb } from '../services/firebase-client';
import { setAdminHint } from '../utils/admin-hint';
import { AdminSessionStore } from './admin-session.store';

import {
  Auth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unavailable';

export interface AuthUser {
  email: string | null;
  uid: string;
}

const NOT_CONFIGURED = 'Firebase is not configured';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = getFirebaseAuth();
  private readonly db = getFirebaseDb();

  private readonly _isAdmin = signal(false);
  private readonly _isOwner = signal(false);
  private readonly _status = signal<AuthStatus>('loading');
  private readonly _user = signal<AuthUser | null>(null);

  private generation = 0;
  private resolveReady: () => void = () => undefined;
  private readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  readonly isAdmin = this._isAdmin.asReadonly();
  /** The admin who manages the friends' messages; the security rules enforce it, this only shapes the UI. */
  readonly isOwner = this._isOwner.asReadonly();
  readonly isSignedIn = computed(() => this._status() === 'signed-in');
  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();

  constructor() {
    inject(AdminSessionStore).attach(this);

    if (this.auth === null || this.db === null) {
      this._status.set('unavailable');
      this.resolveReady();
      return;
    }

    onAuthStateChanged(this.auth, (firebaseUser) => {
      void this.applyUser(firebaseUser);
    });
  }

  /** Resolves once the first auth state, and its admin check, is known. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  async signIn(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.requireAuth(), email, password);
    // Settle the admin check before resolving, so a guard right after sign in sees the final state.
    await this.applyUser(credential.user);
  }

  async signOut(): Promise<void> {
    await signOut(this.requireAuth());
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.requireAuth(), email);
  }

  async getIdToken(): Promise<string | null> {
    return (await this.auth?.currentUser?.getIdToken()) ?? null;
  }

  private async applyUser(firebaseUser: AuthUser | null): Promise<void> {
    const run = ++this.generation;

    if (firebaseUser === null) {
      this._user.set(null);
      this._isAdmin.set(false);
      this._isOwner.set(false);
      this._status.set('signed-out');
      setAdminHint(false);
      this.resolveReady();
      return;
    }

    const isAdmin = await this.hasOwnDocument('admins', firebaseUser.uid);
    const isOwner = isAdmin && (await this.hasOwnDocument('owners', firebaseUser.uid));
    if (run !== this.generation) return; // a newer auth state superseded this one

    this._user.set({ email: firebaseUser.email, uid: firebaseUser.uid });
    this._isAdmin.set(isAdmin);
    this._isOwner.set(isOwner);
    this._status.set('signed-in');
    setAdminHint(isAdmin);
    this.resolveReady();
  }

  /**
   * A user is an admin when `admins/{uid}` exists, and the owner when `owners/{uid}` exists too; the rules
   * let each user read only their own.
   */
  private async hasOwnDocument(collection: 'admins' | 'owners', uid: string): Promise<boolean> {
    if (this.db === null) return false;

    try {
      return (await getDoc(doc(this.db, collection, uid))).exists();
    } catch {
      return false; // permission denied or offline: never grant a role on doubt
    }
  }

  private requireAuth(): Auth {
    if (this.auth === null) throw new Error(NOT_CONFIGURED);
    return this.auth;
  }
}
