import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';

import { CongratulationMedia, CongratulationPhoto } from '../models/congratulation.model';
import { cloudinaryVideoPoster, cloudinaryVideoUrl } from './cloudinary-video';
import { youtubeEmbedUrl, youtubePoster, youtubeVideoId } from './youtube';

/** A video ready to show: a still image first, the player only once it is asked for. */
export type VideoSource =
  | { embedUrl: string; kind: 'youtube'; poster: string }
  | { fileUrl: string; kind: 'file'; poster: string | null };

/** What the media side of a slide shows. */
export type SlideMedia =
  CongratulationPhoto | { kind: 'text' } | { kind: 'video'; video: VideoSource };

/**
 * Resolves a message's media into what its slide shows. A message without media, a link that is not a
 * YouTube video or a Cloudinary video without a configured cloud shows its text alone.
 */
export function slideMedia(
  media: CongratulationMedia | undefined,
  cloudinary: CloudinaryEnvironment = environment.cloudinary
): SlideMedia {
  if (media?.kind === 'photo') return media;

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
