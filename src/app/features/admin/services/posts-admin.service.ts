import { Injectable } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { toPhotoPost } from '@features/photo-posts/utils/post-from-document';
import { PostVisibility, toPostDocument } from '@features/photo-posts/utils/post-to-document';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export type PostsAdminFailure = 'not-configured' | 'request-failed';

export class PostsAdminError extends Error {
  constructor(readonly reason: PostsAdminFailure) {
    super(reason);
    this.name = 'PostsAdminError';
  }
}

export interface PostEntry extends PostVisibility {
  post: PhotoPost;
}

/** Reads and writes posts as an admin; the security rules reject anyone else. */
@Injectable({ providedIn: 'root' })
export class PostsAdminService {
  /** Every post, hidden ones included, newest first. Documents that cannot be shown are skipped. */
  async list(): Promise<readonly PostEntry[]> {
    const snapshot = await this.run((db) => getDocs(collection(db, 'posts')));

    return snapshot.docs
      .flatMap((item) => {
        const data = item.data();
        const post = toPhotoPost(item.id, data);
        return post === null ? [] : [{ hidden: data['hidden'] === true, post }];
      })
      .sort((a, b) => b.post.takenAt.localeCompare(a.post.takenAt));
  }

  /** One post with its visibility, or null when it does not exist or cannot be shown. */
  async get(postId: string): Promise<PostEntry | null> {
    const snapshot = await this.run((db) => getDoc(doc(db, 'posts', postId)));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const post = toPhotoPost(snapshot.id, data);

    return post === null ? null : { hidden: data?.['hidden'] === true, post };
  }

  /** Creates a post and returns the id Firestore gave it; the post's own `id` is ignored. */
  async create(post: PhotoPost, visibility: PostVisibility): Promise<string> {
    const created = await this.run((db) =>
      addDoc(collection(db, 'posts'), toPostDocument(post, visibility))
    );
    return created.id;
  }

  /** Replaces the whole document of an existing post. */
  async save(post: PhotoPost, visibility: PostVisibility): Promise<void> {
    await this.run((db) => setDoc(doc(db, 'posts', post.id), toPostDocument(post, visibility)));
  }

  /** Hides or publishes a post without touching anything else in it. */
  async setHidden(postId: string, hidden: boolean): Promise<void> {
    await this.run((db) => updateDoc(doc(db, 'posts', postId), { hidden }));
  }

  async remove(postId: string): Promise<void> {
    await this.run((db) => deleteDoc(doc(db, 'posts', postId)));
  }

  private async run<T>(
    action: (db: NonNullable<ReturnType<typeof getFirebaseDb>>) => Promise<T>
  ): Promise<T> {
    const db = getFirebaseDb();
    if (db === null) throw new PostsAdminError('not-configured');

    try {
      return await action(db);
    } catch {
      throw new PostsAdminError('request-failed');
    }
  }
}
