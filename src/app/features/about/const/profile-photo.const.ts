import { Photo } from '@features/photo-posts/models/photo.model';

/** The portrait ships with the site, so nothing in Cloudinary can make it disappear. */
export const PROFILE_PHOTO_SOURCE = '/assets/images/profile.webp';

export const PROFILE_PHOTO: Photo = {
  alt: 'Santi García',
  height: 794,
  id: 'profile',
  width: 600,
};
