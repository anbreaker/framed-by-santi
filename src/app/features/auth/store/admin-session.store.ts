import { computed, inject, Injectable, InjectionToken, Injector, signal } from '@angular/core';

import { hasAdminHint } from '../utils/admin-hint';
import { hasStoredFirebaseUser } from '../utils/stored-session';
import type { AuthStore } from './auth.store';

/** Tells whether Firebase kept a signed-in user on this browser; replaced in tests. */
export const STORED_SESSION_CHECK = new InjectionToken<() => Promise<boolean>>(
  'STORED_SESSION_CHECK',
  { factory: (): (() => Promise<boolean>) => () => hasStoredFirebaseUser() }
);

/**
 * What the public pages know about the admin, without the Firebase SDK. Auth is loaded when the hint says
 * an admin signed in on this browser, when Firebase kept a signed-in user from before the hint existed,
 * or when something asks for it (the admin guard, the sign out).
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionStore {
  private readonly injector = inject(Injector);
  private readonly storedSession = inject(STORED_SESSION_CHECK);
  private readonly auth = signal<AuthStore | null>(null);
  private loading: Promise<AuthStore> | null = null;

  /** Nobody is an admin until auth is loaded and says so. */
  readonly isAdmin = computed(() => this.auth()?.isAdmin() ?? false);

  constructor() {
    // If auth cannot be loaded (offline), the admin links just stay hidden until it can.
    if (hasAdminHint()) {
      this.load().catch(() => undefined);
    } else {
      void this.loadForOldSession();
    }
  }

  /** Loads auth once; later calls get the same store, and a failed load can be tried again. */
  load(): Promise<AuthStore> {
    this.loading ??= import('./auth.store')
      .then(({ AuthStore }) => {
        const auth = this.injector.get(AuthStore);
        this.attach(auth);
        return auth;
      })
      .catch((error: unknown) => {
        this.loading = null;
        throw error;
      });
    return this.loading;
  }

  /** A session from before the hint existed: load auth once, and auth leaves the hint for next time. */
  private async loadForOldSession(): Promise<void> {
    if (await this.storedSession()) await this.load().catch(() => undefined);
  }

  /** Called by AuthStore when it is created, so a sign in on /admin shows in the header without reloading. */
  attach(auth: AuthStore): void {
    this.auth.set(auth);
  }

  async signOut(): Promise<void> {
    await (await this.load()).signOut();
  }
}
