import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';
import { photoUrl } from '@features/photo-posts/utils/photo-url';

import { CongratulationMedia } from '../models/congratulation.model';
import { cloudinaryVideoPoster } from './cloudinary-video';
import { youtubePoster, youtubeVideoId } from './youtube';

/** Width of the thumbnails in the dashboard list. */
const THUMBNAIL_WIDTH = 480;

/** A small image of one photo or video, or null when it has none. */
function itemThumbnail(
  media: CongratulationMedia,
  cloudinary: CloudinaryEnvironment
): string | null {
  switch (media.kind) {
    case 'photo':
      return photoUrl(media.photo, THUMBNAIL_WIDTH, cloudinary);
    case 'youtube': {
      const id = youtubeVideoId(media.video);
      return id === null ? null : youtubePoster(id);
    }
    case 'cloudinary':
      return cloudinaryVideoPoster(media.publicId, cloudinary);
  }
}

/** A small image of a message for the dashboard list: its first photo or video that has one. */
export function mediaThumbnail(
  media: readonly CongratulationMedia[],
  cloudinary: CloudinaryEnvironment = environment.cloudinary
): string | null {
  for (const item of media) {
    const thumbnail = itemThumbnail(item, cloudinary);
    if (thumbnail !== null) return thumbnail;
  }
  return null;
}
