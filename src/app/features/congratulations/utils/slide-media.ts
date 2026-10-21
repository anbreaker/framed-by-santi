import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';
import { photoSrcset, photoUrl } from '@features/photo-posts/utils/photo-url';

import { CongratulationMedia } from '../models/congratulation.model';
import { cloudinaryVideoPoster, cloudinaryVideoUrl } from './cloudinary-video';
import { youtubeEmbedUrl, youtubePoster, youtubeVideoId } from './youtube';

/** A video ready to show: a still image first, the player only once it is asked for. */
export type VideoSource =
  | { embedUrl: string; kind: 'youtube'; poster: string }
  | { fileUrl: string; kind: 'file'; poster: string | null };

/** What the media side of a slide shows. */
export type SlideMedia =
  | { alt: string; kind: 'photo'; src: string; srcset: string | null }
  | { kind: 'text' }
  | { kind: 'video'; video: VideoSource };

/** Width of the plain `src`; the browser picks a better one from `srcset`. */
const PHOTO_WIDTH = 1600;

/**
 * Resolves a message's media into what its slide shows: a photo is delivered like the photos of the sets.
 * A message without media, a link that is not a
 * YouTube video or a Cloudinary video without a configured cloud shows its text alone.
 */
export function slideMedia(
  media: CongratulationMedia | undefined,
  cloudinary: CloudinaryEnvironment = environment.cloudinary
): SlideMedia {
  if (media?.kind === 'photo') {
    return {
      alt: media.photo.alt,
      kind: 'photo',
      src: photoUrl(media.photo, PHOTO_WIDTH, cloudinary),
      srcset: photoSrcset(media.photo, cloudinary),
    };
  }

  if (media?.kind === 'youtube') {
    const id = youtubeVideoId(media.video);
    if (id === null) return { kind: 'text' };

    return {
      kind: 'video',
      video: { embedUrl: youtubeEmbedUrl(id), kind: 'youtube', poster: youtubePoster(id) },
    };
  }

  if (media?.kind === 'cloudinary') {
    const fileUrl = cloudinaryVideoUrl(media.publicId, cloudinary);
    if (fileUrl === null) return { kind: 'text' };

    return {
      kind: 'video',
      video: { fileUrl, kind: 'file', poster: cloudinaryVideoPoster(media.publicId, cloudinary) },
    };
  }

  return { kind: 'text' };
}
