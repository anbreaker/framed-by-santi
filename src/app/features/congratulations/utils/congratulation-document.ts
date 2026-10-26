import { Photo } from '@features/photo-posts/models/photo.model';

import {
  Congratulation,
  CongratulationDraft,
  CongratulationMedia,
} from '../models/congratulation.model';

/** The photos and videos of a message, in order, as they are saved. */
export interface CongratulationGallery {
  items: readonly CongratulationMedia[];
  kind: 'gallery';
}

/** The fields of `congratulations/{id}`, exactly the ones the security rules accept. */
export interface CongratulationDocument {
  createdAt: number;
  from: string;
  media: CongratulationGallery | null;
  message: string;
}

export function congratulationToDocument(
  draft: CongratulationDraft,
  createdAt: number
): CongratulationDocument {
  return {
    createdAt,
    from: draft.from,
    media: draft.media.length > 0 ? { items: draft.media, kind: 'gallery' } : null,
    message: draft.message,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPhoto = (value: unknown): value is Photo =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['width'] === 'number' &&
  typeof value['height'] === 'number' &&
  typeof value['alt'] === 'string';

const asPhotos = (photos: readonly Photo[]): CongratulationMedia[] =>
  photos.map((photo) => ({ kind: 'photo', photo }));

/** One photo or video, or null when it is not one it knows. */
function itemFrom(value: unknown): CongratulationMedia | null {
  if (!isRecord(value)) return null;

  if (value['kind'] === 'photo' && isPhoto(value['photo'])) {
    return { kind: 'photo', photo: value['photo'] };
  }
  if (value['kind'] === 'youtube' && typeof value['video'] === 'string') {
    return { kind: 'youtube', video: value['video'] };
  }
  if (value['kind'] === 'cloudinary' && typeof value['publicId'] === 'string') {
    return { kind: 'cloudinary', publicId: value['publicId'] };
  }
  return null;
}

/**
 * The photos and videos of a saved message. Messages hold a gallery of items; older ones hold a list of
 * `photos`, a single `photo` or a single video, which are read as a list too.
 */
function mediaFrom(value: unknown): CongratulationMedia[] {
  if (!isRecord(value)) return [];

  if (value['kind'] === 'gallery') {
    const items = Array.isArray(value['items']) ? value['items'] : [];
    return items.map(itemFrom).filter((item): item is CongratulationMedia => item !== null);
  }
  if (value['kind'] === 'photo') {
    if (Array.isArray(value['photos'])) return asPhotos(value['photos'].filter(isPhoto));
    return isPhoto(value['photo']) ? asPhotos([value['photo']]) : [];
  }

  const item = itemFrom(value);
  return item === null ? [] : [item];
}

/**
 * A saved message, or null when the document lacks what every slide needs. Media it does not know, and
 * photos it cannot read, are dropped, so the words still show.
 */
export function congratulationFromDocument(id: string, data: unknown): Congratulation | null {
  if (!isRecord(data)) return null;

  const { createdAt, from, message } = data;
  if (typeof from !== 'string' || typeof message !== 'string' || typeof createdAt !== 'number') {
    return null;
  }

  return { createdAt, from, id, media: mediaFrom(data['media']), message };
}
