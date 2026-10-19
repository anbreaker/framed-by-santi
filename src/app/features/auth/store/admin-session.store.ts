import { computed, inject, Injectable, Injector, signal } from '@angular/core';

import { hasAdminHint } from '../utils/admin-hint';
import type { AuthStore } from './auth.store';

/**
 * What the public pages know about the admin, without the Firebase SDK. Auth is loaded only when the hint
 * says someone signed in on this browser, or when something asks for it (the admin guard, the sign out).
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionStore {
  private readonly injector = inject(Injector);
  private readonly auth = signal<AuthStore | null>(null);
  private loading: Promise<AuthStore> | null = null;

  /** Nobody is an admin until auth is loaded and says so. */
  readonly isAdmin = computed(() => this.auth()?.isAdmin() ?? false);

  constructor() {
    // If auth cannot be loaded (offline), the admin links just stay hidden until it can.
    if (hasAdminHint()) this.load().catch(() => undefined);
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

  /** Called by AuthStore when it is created, so a sign in on /admin shows in the header without reloading. */
  attach(auth: AuthStore): void {
    this.auth.set(auth);
  }

  async signOut(): Promise<void> {
    await (await this.load()).signOut();
  }
}
