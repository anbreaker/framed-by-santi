import { PhotoPost } from '../models/photo-post.model';

/**
 * Newest set first: by the day it was taken and, for sets of the same day, by when it was created.
 * Sets from before the creation time existed count as older than any that has one.
 */
export function byNewest(a: PhotoPost, b: PhotoPost): number {
  return (
    b.takenAt.localeCompare(a.takenAt) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  );
}
