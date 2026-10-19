import { PROFILE_PHOTO, PROFILE_PHOTO_SOURCE } from '@features/about/const/profile-photo.const';
import { Photo } from '@features/photo-posts/models/photo.model';

export interface Portrait {
  photo: Photo;
  /** A file that ships with the site, or null to serve the photo from Cloudinary. */
  source: string | null;
}

/** The portrait every page shows: the one chosen in the dashboard, or the one that ships with the site. */
export function portraitFor(chosen: Photo | null): Portrait {
  return chosen === null
    ? { photo: PROFILE_PHOTO, source: PROFILE_PHOTO_SOURCE }
    : { photo: chosen, source: null };
}
