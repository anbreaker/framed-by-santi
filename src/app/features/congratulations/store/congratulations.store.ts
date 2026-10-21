import { Injectable, signal } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';

import { Congratulation, CongratulationDraft } from '../models/congratulation.model';
import {
  congratulationFromDocument,
  congratulationToDocument,
} from '../utils/congratulation-document';

import { collection, deleteDoc, doc, Firestore, getDocs, setDoc } from 'firebase/firestore';

export type CongratulationsFailure = 'not-configured' | 'request-failed';

export class CongratulationsError extends Error {
  constructor(readonly reason: CongratulationsFailure) {
    super(reason);
    this.name = 'CongratulationsError';
  }
}

export type CongratulationsStatus = 'failed' | 'idle' | 'loading' | 'ready';

const COLLECTION = 'congratulations';

const byCreation = (a: Congratulation, b: Congratulation): number => a.createdAt - b.createdAt;

/**
 * The friends' messages, read by every admin and written by the owner. The security rules decide who may
 * do what; this store only keeps the list in step with what was saved.
 */
@Injectable({ providedIn: 'root' })
export class CongratulationsStore {
  private readonly _items = signal<readonly Congratulation[]>([]);
  private readonly _status = signal<CongratulationsStatus>('idle');

  /** Oldest first, the order Santi reads them in. */
  readonly items = this._items.asReadonly();
  readonly status = this._status.asReadonly();

  async load(): Promise<void> {
    this._status.set('loading');

    try {
      const snapshot = await this.run((db) => getDocs(collection(db, COLLECTION)));
      const items = snapshot.docs
        .map((document) => congratulationFromDocument(document.id, document.data()))
        .filter((item): item is Congratulation => item !== null)
        .sort(byCreation);

      this._items.set(items);
      this._status.set('ready');
    } catch {
      this._status.set('failed');
    }
  }

  /** Saves a new message at the end of the list, or replaces the one with this id keeping its date. */
  async save(draft: CongratulationDraft, id?: string): Promise<Congratulation> {
    const existing = this._items().find((item) => item.id === id);
    const createdAt = existing?.createdAt ?? Date.now();

    const savedId = await this.run(async (db) => {
      const reference =
        id === undefined ? doc(collection(db, COLLECTION)) : doc(db, COLLECTION, id);
      await setDoc(reference, congratulationToDocument(draft, createdAt));
      return reference.id;
    });

    const saved: Congratulation = { ...draft, createdAt, id: savedId };
    if (saved.media === undefined) delete saved.media;

    this._items.update((items) =>
      [...items.filter((item) => item.id !== savedId), saved].sort(byCreation)
    );
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.run((db) => deleteDoc(doc(db, COLLECTION, id)));
    this._items.update((items) => items.filter((item) => item.id !== id));
  }

  private async run<T>(operation: (db: Firestore) => Promise<T>): Promise<T> {
    const db = getFirebaseDb();
    if (db === null) throw new CongratulationsError('not-configured');

    try {
      return await operation(db);
    } catch {
      throw new CongratulationsError('request-failed');
    }
  }
}
