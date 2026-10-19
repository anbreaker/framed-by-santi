import { Injectable, signal } from '@angular/core';

import { isFirebaseConfigured } from '@features/auth/services/firebase-config';
import { Photo } from '@features/photo-posts/models/photo.model';
import { getDocument } from '@features/photo-posts/services/firestore-rest';

import { toSiteSettings } from '../models/site-settings.model';

/** The site settings for the public pages, read without the Firebase SDK. */
@Injectable({ providedIn: 'root' })
export class SiteSettingsStore {
  private readonly configured = isFirebaseConfigured();
  private readonly _profilePhoto = signal<Photo | null>(null);
  private readonly _ready = signal(!this.configured);
  private changedMeanwhile = false;

  /** The About portrait chosen in the dashboard; null means the one that ships with the site. */
  readonly profilePhoto = this._profilePhoto.asReadonly();

  /** False until the settings have been read (or failed to), so the page can wait instead of flashing. */
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
    try {
      const document = await getDocument('settings', 'site');
      if (!this.changedMeanwhile)
        this._profilePhoto.set(toSiteSettings(document?.data).profilePhoto);
    } catch {
      // Keep the portrait that ships with the site.
    }
    this._ready.set(true);
  }
}
