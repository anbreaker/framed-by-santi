import { environment } from '@environments/environment';
import { CloudinaryEnvironment } from '@environments/environment.model';
import { photoUrl } from '@features/photo-posts/utils/photo-url';

import { CongratulationMedia } from '../models/congratulation.model';
import { cloudinaryVideoPoster } from './cloudinary-video';
import { youtubePoster, youtubeVideoId } from './youtube';

/** Width of the thumbnails in the dashboard list. */
const THUMBNAIL_WIDTH = 480;

/** A small image of a message's media for the dashboard list, or null when there is none. */
export function mediaThumbnail(
  media: CongratulationMedia | undefined,
  cloudinary: CloudinaryEnvironment = environment.cloudinary
): string | null {
  switch (media?.kind) {
    case 'photo':
      return photoUrl(media.photo, THUMBNAIL_WIDTH, cloudinary);
    case 'youtube': {
      const id = youtubeVideoId(media.video);
      return id === null ? null : youtubePoster(id);
    }
    case 'cloudinary':
      return cloudinaryVideoPoster(media.publicId, cloudinary);
    default:
      return null;
  }
}
