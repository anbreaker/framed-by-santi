import type { Photo } from '@features/photo-posts/models/photo.model';

/**
 * The `settings/site` document exactly as the dashboard saves it. The save test and the photo cleanup
 * test both use it, so a change in its shape fails both and the cleanup cannot silently miss the portrait.
 */
export const SAVED_PROFILE_PHOTO: Photo = {
  alt: 'Santi García',
  height: 794,
  id: 'framed-by-santi/posts/portrait',
  publicId: 'framed-by-santi/posts/portrait',
  width: 600,
};

export const SAVED_SITE_SETTINGS = { profilePhoto: SAVED_PROFILE_PHOTO };
