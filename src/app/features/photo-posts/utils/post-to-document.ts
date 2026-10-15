import { PhotoPost } from '../models/photo-post.model';

export interface PostVisibility {
  /** Hidden posts are only readable by admins, see `firestore.rules`. */
  hidden: boolean;
}

/**
 * Builds the Firestore document for a post; the inverse of `toPhotoPost`.
 * Optional fields are left out when empty because Firestore rejects `undefined` values.
 */
export function toPostDocument(
  post: PhotoPost,
  { hidden }: PostVisibility
): Record<string, unknown> {
  return {
    caption: post.caption,
    ...(post.createdAt !== undefined && { createdAt: post.createdAt }),
    ...(post.description !== undefined && { description: post.description }),
    hidden,
    photos: post.photos.map((photo) => ({ ...photo })),
    tags: [...post.tags],
    takenAt: post.takenAt,
  };
}
