import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';

/**
 * A video uploaded to Cloudinary, by its full public id. `f_auto` and `q_auto` pick the format and quality
 * the browser handles best. Null when Cloudinary is not configured.
 */
export function cloudinaryVideoUrl(
  publicId: string,
  config: CloudinaryEnvironment = environment.cloudinary
): string | null {
  if (!config.cloudName) return null;

  return `https://res.cloudinary.com/${config.cloudName}/video/upload/f_auto,q_auto/${publicId}`;
}

/** The first frame of a Cloudinary video as a still image, shown until the video is asked for. */
export function cloudinaryVideoPoster(
  publicId: string,
  config: CloudinaryEnvironment = environment.cloudinary
): string | null {
  if (!config.cloudName) return null;

  return `https://res.cloudinary.com/${config.cloudName}/video/upload/so_0,f_auto,q_auto,w_1200/${publicId}.jpg`;
}
