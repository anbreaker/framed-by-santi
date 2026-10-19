import { Injectable } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';
import { Photo } from '@features/photo-posts/models/photo.model';

import { doc, setDoc } from 'firebase/firestore';

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
}
