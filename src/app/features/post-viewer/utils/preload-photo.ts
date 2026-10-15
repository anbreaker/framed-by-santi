import { Photo } from '@features/photo-posts/models/photo.model';
import { photoSrcset, photoUrl } from '@features/photo-posts/utils/photo-url';

/**
 * Starts downloading a photo before it is needed, with the same address and sizes the viewer will ask for,
 * so the browser serves it from cache when the visitor gets there. A missing photo is skipped, which lets
 * callers pass the one before the first or after the last without checking.
 */
export function preloadPhoto(photo: Photo | undefined, sizes = '100vw'): void {
  if (photo === undefined) return;

  const image = new Image();
  const srcset = photoSrcset(photo);

  image.sizes = sizes;
  if (srcset) image.srcset = srcset;
  image.src = photoUrl(photo);
}
