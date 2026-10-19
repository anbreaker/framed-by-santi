import { computed, Injectable, signal } from '@angular/core';

import { queryCollection } from '@core/firestore/firestore-rest';
import { isFirebaseConfigured } from '@features/auth/services/firebase-config';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPost } from '../models/photo-post.model';
import { DEFAULT_THEMES, Theme, toTheme } from '../models/theme.model';
import { toPhotoPost } from '../utils/post-from-document';
import { byNewest } from '../utils/post-order';

@Injectable({ providedIn: 'root' })
export class PhotoPostsStore {
  /** Without Firebase the bundled posts are all there is; with it they only wait there if it cannot be read. */
  private readonly firebaseConfigured = isFirebaseConfigured();
  private readonly _posts = signal<readonly PhotoPost[]>(
    this.firebaseConfigured ? [] : LOCAL_PHOTO_POSTS
  );
  private readonly _ready = signal(!this.firebaseConfigured);
  private latestRequest = 0;

  readonly posts = this._posts.asReadonly();

  /** False until the published posts have been read (or failed to), so pages can wait instead of showing "nothing". */
  readonly ready = this._ready.asReadonly();

  readonly latestPost = computed<PhotoPost | undefined>(() => this._posts()[0]);

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
    if (!this.firebaseConfigured) return;

    try {
      (await queryCollection('themes'))
        .map((item) => toTheme(item.id, item.data))
        .filter((theme): theme is Theme => theme !== null)
        .forEach((theme) => this.addTheme(theme));
    } catch {
      // Keep the default themes.
    }
  }

  /**
   * Reads the published posts again, so a set that was just published, changed or hidden in the dashboard
   * shows on the site without reloading it. If none is visible any more, nothing is shown: hiding everything
   * is a choice, not a failure.
   */
  async refresh(): Promise<void> {
    this.apply(await this.fetchPublished());
  }

  /** Reads the published posts from Firestore at start. */
  private async loadFromFirestore(): Promise<void> {
    this.apply(await this.fetchPublished());
  }

  /**
   * An answer replaces what is shown, even when it is empty. A failed read keeps what is shown, and if
   * nothing was shown yet it falls back to the bundled posts so the site is never broken by an outage.
   * `undefined` means a newer request took over and will apply its own answer.
   */
  private apply(result: PhotoPost[] | null | undefined): void {
    if (result === undefined) return;

    if (result !== null) {
      this._posts.set(result);
    } else if (!this._ready()) {
      this._posts.set(LOCAL_PHOTO_POSTS);
    }

    this._ready.set(true);
  }

  /**
   * The published posts, newest first; null when they cannot be read; undefined when a newer request has
   * been made meanwhile. The `hidden == false` filter is required: the security rules only allow queries
   * that cannot return hidden posts.
   */
  private async fetchPublished(): Promise<PhotoPost[] | null | undefined> {
    if (!this.firebaseConfigured) return null;

    const request = ++this.latestRequest;

    try {
      const documents = await queryCollection('posts', { equals: false, field: 'hidden' });
      if (request !== this.latestRequest) return undefined;

      return documents
        .map((item) => toPhotoPost(item.id, item.data))
        .filter((post): post is PhotoPost => post !== null)
        .sort(byNewest);
    } catch {
      return request === this.latestRequest ? null : undefined;
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
