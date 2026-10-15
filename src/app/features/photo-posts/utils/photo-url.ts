import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';

import { Photo } from '../models/photo.model';

/**
 * Fixed set of delivery widths. Few variants mean more CDN cache hits and fewer Cloudinary
 * transformations; the browser picks the right one from `srcset`.
 */
export const PHOTO_WIDTHS = [480, 800, 1200, 1600, 2400] as const;

/** Width used for the plain `src` fallback of an image. */
export const DEFAULT_PHOTO_WIDTH = 1200;

/** Smallest fixed width that is at least `width`, or the largest one. */
export function snapWidth(width: number): number {
  return (
    PHOTO_WIDTHS.find((candidate) => candidate >= width) ?? PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1]
  );
}

/**
 * `c_limit` never upscales, `f_auto` serves the best format the browser supports and `q_auto`
 * picks the quality. A photo smaller than the requested width is delivered at its own size.
 */
export function cloudinaryUrl(
  config: CloudinaryEnvironment,
  photoId: string,
  width: number
): string {
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/c_limit,f_auto,q_auto,w_${width}/${config.publicIdPrefix}${photoId}`;
}

/** Photos uploaded from the dashboard carry their full public id; the rest live under the configured prefix. */
function photoCloudinaryUrl(config: CloudinaryEnvironment, photo: Photo, width: number): string {
  return photo.publicId === undefined
    ? cloudinaryUrl(config, photo.id, width)
    : cloudinaryUrl({ ...config, publicIdPrefix: '' }, photo.publicId, width);
}

/**
 * Single place that turns a photo into an image URL: a Cloudinary delivery URL when the cloud
 * is configured, the local WebP file otherwise (tests, offline work, forks).
 */
export function photoUrl(
  photo: Photo,
  width: number = DEFAULT_PHOTO_WIDTH,
  config: CloudinaryEnvironment = environment.cloudinary
): string {
  if (!config.cloudName) return `/local-photos/${photo.id}.webp`;

  return photoCloudinaryUrl(config, photo, snapWidth(width));
}

/**
 * Candidates for the `srcset` attribute, or null when photos are served locally.
 * Widths larger than the photo itself are left out, and the photo's own width closes the list
 * when it is smaller than the largest fixed width, so the descriptors never promise more pixels
 * than exist.
 */
export function photoSrcset(
  photo: Photo,
  config: CloudinaryEnvironment = environment.cloudinary
): string | null {
  if (!config.cloudName) return null;

  const widths: number[] = PHOTO_WIDTHS.filter((width) => width <= photo.width);
  const largest = PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1];

  if (photo.width < largest && !widths.includes(photo.width)) widths.push(photo.width);

  return widths.map((width) => `${photoCloudinaryUrl(config, photo, width)} ${width}w`).join(', ');
}
