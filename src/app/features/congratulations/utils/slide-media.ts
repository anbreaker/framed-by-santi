import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';
import { Photo } from '@features/photo-posts/models/photo.model';
import { PHOTO_WIDTHS, photoSrcset, photoUrl } from '@features/photo-posts/utils/photo-url';

import { CongratulationMedia } from '../models/congratulation.model';
import { cloudinaryVideoPoster, cloudinaryVideoUrl } from './cloudinary-video';
import { youtubeEmbedUrl, youtubePoster, youtubeVideoId } from './youtube';

/** A video ready to show: a still image first, the player only once it is asked for. */
export type VideoSource =
  | { embedUrl: string; kind: 'youtube'; poster: string }
  | { fileUrl: string; kind: 'file'; poster: string | null };

/**
 * One photo or video of a slide: a photo ready for an `img`, with the saved photo it comes from to open
 * it full screen, or a video with its still image first.
 */
export type SlideItem =
  | {
      alt: string;
      /** A tiny copy to blur behind an upright photo shown whole; null for one that fills the frame. */
      backdrop: string | null;
      kind: 'photo';
      photo: Photo;
      src: string;
      srcset: string | null;
    }
  | { kind: 'video'; video: VideoSource };

/** Width of the plain `src`; the browser picks a better one from `srcset`. */
const PHOTO_WIDTH = 1600;

/** The copy blurred behind an upright photo takes the smallest fixed width, already in its `srcset`. */
const BACKDROP_WIDTH = PHOTO_WIDTHS[0];

/** What one photo or video shows, or null for a link that is not a YouTube video or an unconfigured cloud. */
function slideItem(
  media: CongratulationMedia,
  cloudinary: CloudinaryEnvironment
): SlideItem | null {
  if (media.kind === 'photo') {
    const upright = media.photo.height > media.photo.width;

    return {
      alt: media.photo.alt,
      backdrop: upright ? photoUrl(media.photo, BACKDROP_WIDTH, cloudinary) : null,
      kind: 'photo',
      photo: media.photo,
      src: photoUrl(media.photo, PHOTO_WIDTH, cloudinary),
      srcset: photoSrcset(media.photo, cloudinary),
    };
  }

  if (media.kind === 'youtube') {
    const id = youtubeVideoId(media.video);
    if (id === null) return null;

    return {
      kind: 'video',
      video: { embedUrl: youtubeEmbedUrl(id), kind: 'youtube', poster: youtubePoster(id) },
    };
  }

  const fileUrl = cloudinaryVideoUrl(media.publicId, cloudinary);
  if (fileUrl === null) return null;

  return {
    kind: 'video',
    video: { fileUrl, kind: 'file', poster: cloudinaryVideoPoster(media.publicId, cloudinary) },
  };
}

/**
 * Resolves a message's photos and videos into what its slide shows, in order: photos are delivered like
 * the photos of the sets. A link that is not a YouTube video, or a Cloudinary video without a configured
 * cloud, is left out; a slide left with nothing shows its words alone.
 */
export function slideItems(
  media: readonly CongratulationMedia[],
  cloudinary: CloudinaryEnvironment = environment.cloudinary
): SlideItem[] {
  return media
    .map((item) => slideItem(item, cloudinary))
    .filter((item): item is SlideItem => item !== null);
}
