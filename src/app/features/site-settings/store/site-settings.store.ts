import { inject, Injectable, InjectionToken, signal } from '@angular/core';

import { getDocument } from '@core/firestore/firestore-rest';
import { isFirebaseConfigured } from '@features/auth/services/firebase-config';
import { Photo } from '@features/photo-posts/models/photo.model';
import { withTimeout } from '@shared/utils/with-timeout';

import { toSiteSettings } from '../models/site-settings.model';

/** How long the portrait waits for the settings before showing the one that ships with the site. */
export const SETTINGS_READ_TIMEOUT = new InjectionToken<number>('SETTINGS_READ_TIMEOUT', {
  factory: (): number => 3_000,
});

/** The site settings for the public pages, read without the Firebase SDK. */
@Injectable({ providedIn: 'root' })
export class SiteSettingsStore {
  private readonly timeout = inject(SETTINGS_READ_TIMEOUT);
  private readonly configured = isFirebaseConfigured();
  private readonly _profilePhoto = signal<Photo | null>(null);
  private readonly _ready = signal(!this.configured);
  private changedMeanwhile = false;

  /** The About portrait chosen in the dashboard; null means the one that ships with the site. */
  readonly profilePhoto = this._profilePhoto.asReadonly();

  /** False until the settings have been read (or failed, or took too long), so the page can wait instead of flashing. */
  readonly ready = this._ready.asReadonly();

  constructor() {
    if (this.configured) void this.load();
  }

  /** Shows a photo saved in the dashboard right away. */
  setProfilePhoto(photo: Photo): void {
    this.changedMeanwhile = true;
    this._profilePhoto.set(photo);
    this._ready.set(true);
  }

  private async load(): Promise<void> {
    const read = getDocument('settings', 'site');
    // A late answer still applies, so the chosen portrait replaces the bundled one once it arrives.
    read.then((document) => this.apply(document?.data)).catch(() => undefined);

    try {
      await withTimeout(read, this.timeout);
    } catch {
      // Failed or too slow: show the portrait that ships with the site.
    }
    this._ready.set(true);
  }

  private apply(data: unknown): void {
    if (!this.changedMeanwhile) this._profilePhoto.set(toSiteSettings(data).profilePhoto);
  }
}
