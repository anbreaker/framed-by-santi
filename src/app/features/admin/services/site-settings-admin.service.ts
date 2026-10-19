import { Injectable } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';
import { Photo } from '@features/photo-posts/models/photo.model';
import { toSiteSettings } from '@features/site-settings/models/site-settings.model';

import { doc, getDocFromServer, setDoc } from 'firebase/firestore';

export type SiteSettingsAdminFailure = 'not-configured' | 'request-failed';

export class SiteSettingsAdminError extends Error {
  constructor(readonly reason: SiteSettingsAdminFailure) {
    super(reason);
    this.name = 'SiteSettingsAdminError';
  }
}

/** Saves the site settings as an admin; the security rules reject anyone else and any other field. */
@Injectable({ providedIn: 'root' })
export class SiteSettingsAdminService {
  async saveProfilePhoto(photo: Photo): Promise<void> {
    const db = getFirebaseDb();
    if (db === null) throw new SiteSettingsAdminError('not-configured');

    try {
      await setDoc(doc(db, 'settings', 'site'), { profilePhoto: photo });
    } catch {
      throw new SiteSettingsAdminError('request-failed');
    }
  }

  /**
   * True when the server already holds this photo as the portrait. Asks the server itself: the local
   * cache would also show a write that is still waiting to be sent.
   */
  async isProfilePhotoSaved(id: string): Promise<boolean> {
    const db = getFirebaseDb();
    if (db === null) return false;

    try {
      const snapshot = await getDocFromServer(doc(db, 'settings', 'site'));
      return (
        toSiteSettings(snapshot.exists() ? snapshot.data() : undefined).profilePhoto?.id === id
      );
    } catch {
      return false;
    }
  }
}
