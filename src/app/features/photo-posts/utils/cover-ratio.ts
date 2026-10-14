import { PhotoPost } from '../models/photo-post.model';

/** Width over height of the cover photo, rounded so it is safe to use as a CSS number. */
export function coverRatio(post: PhotoPost): number {
  const cover = post.photos[0];

  return Math.round((cover.width / cover.height) * 1000) / 1000;
}
