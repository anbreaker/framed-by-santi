import { Photo } from '../models/photo.model';
import { PhotoPost } from '../models/photo-post.model';
import { isPostTag, PostTag } from '../models/post-tag.model';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function toPhoto(value: unknown): Photo | null {
  if (!isFields(value)) return null;

  const { alt, description, height, id, title, width } = value;

  if (typeof alt !== 'string' || typeof id !== 'string' || id === '') return null;
  if (!isPositiveNumber(height) || !isPositiveNumber(width)) return null;

  return {
    alt,
    ...(typeof description === 'string' && { description }),
    height,
    id,
    ...(typeof title === 'string' && { title }),
    width,
  };
}

/**
 * Turns a Firestore post document into a `PhotoPost`, or null when it cannot be shown.
 * Unknown tags and non-text hashtags are dropped rather than failing the whole post.
 */
export function toPhotoPost(id: string, data: unknown): PhotoPost | null {
  if (!isFields(data)) return null;

  const { caption, description, hashtags, photos, tags, takenAt } = data;

  if (typeof caption !== 'string' || typeof takenAt !== 'string' || !ISO_DATE.test(takenAt)) {
    return null;
  }

  if (!Array.isArray(photos) || photos.length === 0) return null;

  const mapped = photos.map(toPhoto);
  if (mapped.some((photo) => photo === null)) return null;

  const knownTags: PostTag[] = Array.isArray(tags)
    ? tags.filter((tag): tag is PostTag => typeof tag === 'string' && isPostTag(tag))
    : [];
  const texts = Array.isArray(hashtags)
    ? hashtags.filter((tag): tag is string => typeof tag === 'string')
    : null;

  return {
    caption,
    ...(typeof description === 'string' && { description }),
    ...(texts !== null && { hashtags: texts }),
    id,
    photos: mapped as Photo[],
    tags: knownTags,
    takenAt,
  };
}
