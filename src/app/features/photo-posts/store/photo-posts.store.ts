import { computed, Injectable, signal } from '@angular/core';

import { LOCAL_PHOTO_POSTS } from '../data/local-photo-posts.data';
import { PhotoPost } from '../models/photo-post.model';
import { PostTag } from '../models/post-tag.model';

@Injectable({ providedIn: 'root' })
export class PhotoPostsStore {
  private readonly _posts = signal<readonly PhotoPost[]>(LOCAL_PHOTO_POSTS);

  readonly posts = this._posts.asReadonly();

  readonly latestPost = computed(() => this._posts()[0]);

  readonly availableTags = computed<readonly PostTag[]>(() => {
    const tags = new Set(this._posts().flatMap((post) => post.tags));
    return [...tags].sort();
  });

  findById(postId: string): PhotoPost | undefined {
    return this._posts().find((post) => post.id === postId);
  }

  filterByTag(tag: PostTag | null): readonly PhotoPost[] {
    if (tag === null) return this._posts();
    return this._posts().filter((post) => post.tags.includes(tag));
  }
}
