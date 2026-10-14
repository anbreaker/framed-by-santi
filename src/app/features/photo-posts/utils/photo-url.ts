import { Photo } from '../models/photo.model';

/**
 * Single place that turns a photo into an image URL.
 * Today it serves local WebP files; with Cloudinary it will build
 * `.../upload/f_auto,q_auto,w_<width>/<photo.id>` instead.
 */
export function photoUrl(photo: Photo, _width?: number): string {
  return `/local-photos/${photo.id}.webp`;
}
