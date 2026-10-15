import { Injectable } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';
import { LocalizedText } from '@features/photo-posts/models/localized-text.model';
import { Theme, themeIdFromName } from '@features/photo-posts/models/theme.model';

import { doc, getDoc, setDoc } from 'firebase/firestore';

export type ThemesAdminFailure = 'exists' | 'invalid-name' | 'not-configured' | 'request-failed';

export class ThemesAdminError extends Error {
  constructor(readonly reason: ThemesAdminFailure) {
    super(reason);
    this.name = 'ThemesAdminError';
  }
}

/** Creates themes as an admin; the security rules reject anyone else. */
@Injectable({ providedIn: 'root' })
export class ThemesAdminService {
  /** Saves a new theme. Its id comes from the first language that has a name, English first. */
  async create(label: LocalizedText): Promise<Theme> {
    const id = themeIdFromName(label.en || label.es || label.pt);
    if (id === '') throw new ThemesAdminError('invalid-name');

    const db = getFirebaseDb();
    if (db === null) throw new ThemesAdminError('not-configured');

    try {
      const reference = doc(db, 'themes', id);
      if ((await getDoc(reference)).exists()) throw new ThemesAdminError('exists');

      await setDoc(reference, { label });
      return { id, label };
    } catch (error) {
      throw error instanceof ThemesAdminError ? error : new ThemesAdminError('request-failed');
    }
  }
}
