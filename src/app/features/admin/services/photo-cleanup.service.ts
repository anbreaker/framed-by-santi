import { inject, Injectable } from '@angular/core';

import { AuthStore } from '@features/auth/store/auth.store';

const LAST_RUN_KEY = 'framed-cleanup-at';
const DAY_MS = 24 * 60 * 60 * 1000;
/** If a run reports more left to do, go on, but only this many times in a row. */
const MAX_RUNS_IN_A_ROW = 3;

export type PhotoCleanupFailure = 'failed' | 'not-allowed';

export class PhotoCleanupError extends Error {
  constructor(readonly reason: PhotoCleanupFailure) {
    super(reason);
    this.name = 'PhotoCleanupError';
  }
}

export interface PhotoCleanupResult {
  deleted: number;
  remaining: number;
}

/**
 * Photos are uploaded as soon as they are chosen, so the ones of a set that was never saved stay in
 * Cloudinary. This asks the server to delete the unused ones; the server decides what is safe to delete.
 */
@Injectable({ providedIn: 'root' })
export class PhotoCleanupService {
  private readonly authStore = inject(AuthStore);

  private ranThisSession = false;

  async run(options: { dryRun?: boolean } = {}): Promise<PhotoCleanupResult> {
    const idToken = await this.authStore.getIdToken();
    if (idToken === null) throw new PhotoCleanupError('not-allowed');

    try {
      const response = await fetch('/api/cleanup-photos', {
        body: JSON.stringify(options.dryRun ? { dryRun: true } : {}),
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (response.status === 401 || response.status === 403)
        throw new PhotoCleanupError('not-allowed');
      if (!response.ok) throw new PhotoCleanupError('failed');

      const { deleted, remaining } = (await response.json()) as {
        deleted?: unknown;
        remaining?: unknown;
      };
      if (!Array.isArray(deleted) || typeof remaining !== 'number')
        throw new PhotoCleanupError('failed');

      return { deleted: deleted.length, remaining };
    } catch (error) {
      throw error instanceof PhotoCleanupError ? error : new PhotoCleanupError('failed');
    }
  }

  /** Runs the clean-up in the background, at most once a day, and never lets a failure reach the author. */
  async runIfDue(): Promise<void> {
    if (!this.isDue()) return;

    // Marked before it runs, so a failing server is not asked again until tomorrow.
    this.markRun();

    try {
      for (let run = 0; run < MAX_RUNS_IN_A_ROW; run++) {
        const { remaining } = await this.run();
        if (remaining === 0) break;
      }
    } catch {
      // Nothing to tell the author: the unused photos are only wasted space.
    }
  }

  private isDue(): boolean {
    if (this.ranThisSession) return false;

    try {
      const last = Number(localStorage.getItem(LAST_RUN_KEY));
      return !(Number.isFinite(last) && last > 0 && Date.now() - last < DAY_MS);
    } catch {
      return true;
    }
  }

  private markRun(): void {
    this.ranThisSession = true;

    try {
      localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
    } catch {
      // Without storage the session flag still keeps it to once per visit.
    }
  }
}
