import { Injectable } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';
import { LocalizedText } from '@features/photo-posts/models/localized-text.model';
import { DEFAULT_THEMES, Theme, themeIdFor } from '@features/photo-posts/models/theme.model';

import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

export type ThemesAdminFailure =
  'exists' | 'invalid-name' | 'not-configured' | 'protected' | 'request-failed';

export class ThemesAdminError extends Error {
  constructor(readonly reason: ThemesAdminFailure) {
    super(reason);
    this.name = 'ThemesAdminError';
  }
}

/** Creates themes as an admin; the security rules reject anyone else. */
@Injectable({ providedIn: 'root' })
export class ThemesAdminService {
  /** Saves a new theme. Its id comes from the first language that has a name, English first; the default themes are never replaced. */
  async create(label: LocalizedText): Promise<Theme> {
    const id = themeIdFor(label);
    if (id === '') throw new ThemesAdminError('invalid-name');
    if (DEFAULT_THEMES.some((theme) => theme.id === id)) throw new ThemesAdminError('exists');

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

  /** Deletes a theme created in the dashboard. Sets that use it keep its id but it stops showing; defaults cannot be deleted. */
  async remove(id: string): Promise<void> {
    if (DEFAULT_THEMES.some((theme) => theme.id === id)) throw new ThemesAdminError('protected');

    const db = getFirebaseDb();
    if (db === null) throw new ThemesAdminError('not-configured');

    try {
      await deleteDoc(doc(db, 'themes', id));
    } catch {
      throw new ThemesAdminError('request-failed');
    }
  }
}
