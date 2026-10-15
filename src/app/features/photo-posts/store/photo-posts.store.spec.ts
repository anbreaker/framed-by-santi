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

  it('should list each theme used by a post once, sorted, with its translated name', () => {
    const themes = store.availableThemes();
    const ids = themes.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    expect(themes.every((theme) => theme.label.en !== '')).toBe(true);
    expect(ids.every((id) => store.posts().some((post) => post.tags.includes(id)))).toBe(true);
  });

  it('should forget a theme that was created, and never drop a default one', () => {
    store.addTheme({ id: 'sunset', label: { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' } });
    expect(store.themes().some((theme) => theme.id === 'sunset')).toBe(true);

    store.removeTheme('sunset');
    store.removeTheme('street');

    expect(store.themes().some((theme) => theme.id === 'sunset')).toBe(false);
    expect(store.themes().some((theme) => theme.id === 'street')).toBe(true);
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
