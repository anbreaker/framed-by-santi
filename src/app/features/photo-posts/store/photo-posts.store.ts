import { computed, Injectable, signal } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPost } from '../models/photo-post.model';
import { PostTag } from '../models/post-tag.model';
import { toPhotoPost } from '../utils/post-from-document';

import { collection, getDocs, query, where } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class PhotoPostsStore {
  private readonly _posts = signal<readonly PhotoPost[]>(LOCAL_PHOTO_POSTS);

  readonly posts = this._posts.asReadonly();

  readonly latestPost = computed(() => this._posts()[0]);

  readonly availableTags = computed<readonly PostTag[]>(() => {
    const tags = new Set(this._posts().flatMap((post) => post.tags));
    return [...tags].sort();
  });

  constructor() {
    void this.loadFromFirestore();
  }

  /**
   * Replaces the local posts with the published ones from Firestore. The local data stays when
   * Firebase is not configured, the request fails or nothing valid comes back, so the site is never empty.
   * The `hidden == false` filter is required: the security rules only allow queries that cannot return hidden posts.
   */
  private async loadFromFirestore(): Promise<void> {
    const db = getFirebaseDb();
    if (db === null) return;

    try {
      const snapshot = await getDocs(query(collection(db, 'posts'), where('hidden', '==', false)));
      const posts = snapshot.docs
        .map((item) => toPhotoPost(item.id, item.data()))
        .filter((post): post is PhotoPost => post !== null)
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt));

      if (posts.length > 0) this._posts.set(posts);
    } catch {
      // Keep the local posts.
    }
  }

  findById(postId: string): PhotoPost | undefined {
    return this._posts().find((post) => post.id === postId);
  }

  filterByTag(tag: PostTag | null): readonly PhotoPost[] {
    if (tag === null) return this._posts();
    return this._posts().filter((post) => post.tags.includes(tag));
  }
}
