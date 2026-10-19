import { Photo } from '@features/photo-posts/models/photo.model';
import { toPhoto } from '@features/photo-posts/utils/post-from-document';

/** What the admin can change about the site, stored in `settings/site`. */
export interface SiteSettings {
  /** The About portrait; null keeps the one that ships with the site. */
  profilePhoto: Photo | null;
}

export function toSiteSettings(data: unknown): SiteSettings {
  const fields = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  return { profilePhoto: toPhoto(fields['profilePhoto']) };
}
