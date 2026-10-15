import { computed, Injectable, signal } from '@angular/core';

import { getFirebaseDb } from '@features/auth/services/firebase-client';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPost } from '../models/photo-post.model';
import { DEFAULT_THEMES, Theme, toTheme } from '../models/theme.model';
import { toPhotoPost } from '../utils/post-from-document';

import { collection, getDocs, query, where } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class PhotoPostsStore {
  private readonly _posts = signal<readonly PhotoPost[]>(LOCAL_PHOTO_POSTS);
  private latestRequest = 0;

  readonly posts = this._posts.asReadonly();

  readonly latestPost = computed(() => this._posts()[0]);

  private readonly _themes = signal<readonly Theme[]>(DEFAULT_THEMES);

  /** Every theme that exists, the default ones plus those created in the dashboard. */
  readonly themes = this._themes.asReadonly();

  /** Themes that at least one post uses, sorted by id; these are the gallery filters. */
  readonly availableThemes = computed<readonly Theme[]>(() => {
    const used = new Set(this._posts().flatMap((post) => post.tags));
    return this._themes()
      .filter((theme) => used.has(theme.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  });

  constructor() {
    void this.loadFromFirestore();
    void this.loadThemes();
  }

  /** Makes a theme that was just created available without reloading. */
  addTheme(theme: Theme): void {
    this._themes.update((themes) => [...themes.filter((item) => item.id !== theme.id), theme]);
  }

  /** Forgets a theme that was deleted; the default themes live in the code and stay. */
  removeTheme(id: string): void {
    if (DEFAULT_THEMES.some((theme) => theme.id === id)) return;

    this._themes.update((themes) => themes.filter((theme) => theme.id !== id));
  }

  /** Adds the themes created in Firestore to the default ones; a failure leaves the defaults. */
  private async loadThemes(): Promise<void> {
    const db = getFirebaseDb();
    if (db === null) return;

    try {
      const snapshot = await getDocs(collection(db, 'themes'));
      snapshot.docs
        .map((item) => toTheme(item.id, item.data()))
        .filter((theme): theme is Theme => theme !== null)
        .forEach((theme) => this.addTheme(theme));
    } catch {
      // Keep the default themes.
    }
  }

  /**
   * Reads the published posts again, so a set that was just published, changed or hidden in the dashboard
   * shows on the site without reloading it. If none is visible any more the local data is used, like at start.
   */
  async refresh(): Promise<void> {
    const posts = await this.fetchPublished();

    if (posts !== null) this._posts.set(posts.length > 0 ? posts : LOCAL_PHOTO_POSTS);
  }

  /**
   * Replaces the local posts with the published ones from Firestore. The local data stays when
   * Firebase is not configured, the request fails or nothing valid comes back, so the site is never empty.
   */
  private async loadFromFirestore(): Promise<void> {
    const posts = await this.fetchPublished();

    if (posts !== null && posts.length > 0) this._posts.set(posts);
  }

  /**
   * The published posts, newest first, or null when they cannot be read or a newer request has been made
   * meanwhile (its answer is the one to use). The `hidden == false` filter is required: the security rules
   * only allow queries that cannot return hidden posts.
   */
  private async fetchPublished(): Promise<PhotoPost[] | null> {
    const db = getFirebaseDb();
    if (db === null) return null;

    const request = ++this.latestRequest;

    try {
      const snapshot = await getDocs(query(collection(db, 'posts'), where('hidden', '==', false)));
      if (request !== this.latestRequest) return null;

      return snapshot.docs
        .map((item) => toPhotoPost(item.id, item.data()))
        .filter((post): post is PhotoPost => post !== null)
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    } catch {
      return null;
    }
  }

  findById(postId: string): PhotoPost | undefined {
    return this._posts().find((post) => post.id === postId);
  }

  filterByTag(tag: string | null): readonly PhotoPost[] {
    if (tag === null) return this._posts();
    return this._posts().filter((post) => post.tags.includes(tag));
  }
}
