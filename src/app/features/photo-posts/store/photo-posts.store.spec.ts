import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';

import { PhotoPostsStore } from './photo-posts.store';

describe('PhotoPostsStore', () => {
  let store: PhotoPostsStore;

  beforeEach(() => {
    store = TestBed.inject(PhotoPostsStore);
  });

  it('should expose posts as sets of several photos, newest first', () => {
    const dates = store.posts().map((post) => post.takenAt);

    expect(store.posts().every((post) => post.photos.length > 1)).toBe(true);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('should use the first post as the latest one', () => {
    expect(store.latestPost()).toBe(store.posts()[0]);
  });

  it('should find a post by id and return undefined for unknown ids', () => {
    expect(store.findById('post-2')?.id).toBe('post-2');
    expect(store.findById('missing')).toBeUndefined();
  });

  it('should filter posts by tag and return every post without a tag', () => {
    const night = store.filterByTag('night');

    expect(night.length).toBeGreaterThan(0);
    expect(night.every((post) => post.tags.includes('night'))).toBe(true);
    expect(store.filterByTag(null)).toEqual(store.posts());
  });

  it('should list each tag once, sorted', () => {
    const tags = store.availableTags();

    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toEqual([...tags].sort());
  });

  it('should keep every photo id unique and backed by a local file when photos exist', () => {
    const photos = store.posts().flatMap((post) => post.photos);
    const hasLocalPhotos = existsSync(resolve(process.cwd(), 'public/local-photos'));

    expect(new Set(photos.map((photo) => photo.id)).size).toBe(photos.length);
    if (hasLocalPhotos) {
      photos.forEach((photo) => {
        expect(existsSync(resolve(process.cwd(), `public/local-photos/${photo.id}.webp`))).toBe(
          true
        );
      });
    }
  });
});
