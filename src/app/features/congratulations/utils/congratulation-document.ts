import { Photo } from '@features/photo-posts/models/photo.model';

import {
  Congratulation,
  CongratulationDraft,
  CongratulationMedia,
} from '../models/congratulation.model';

/** The fields of `congratulations/{id}`, exactly the ones the security rules accept. */
export interface CongratulationDocument {
  createdAt: number;
  from: string;
  media: CongratulationMedia | null;
  message: string;
}

export function congratulationToDocument(
  draft: CongratulationDraft,
  createdAt: number
): CongratulationDocument {
  return { createdAt, from: draft.from, media: draft.media ?? null, message: draft.message };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPhoto = (value: unknown): value is Photo =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['width'] === 'number' &&
  typeof value['height'] === 'number' &&
  typeof value['alt'] === 'string';

/** The readable photos of a photo media, from the list or, in older messages, the single `photo`. */
function photosFrom(value: Record<string, unknown>): Photo[] {
  if (Array.isArray(value['photos'])) return value['photos'].filter(isPhoto);
  return isPhoto(value['photo']) ? [value['photo']] : [];
}

function mediaFrom(value: unknown): CongratulationMedia | undefined {
  if (!isRecord(value)) return undefined;

  if (value['kind'] === 'photo') {
    const photos = photosFrom(value);
    return photos.length > 0 ? { kind: 'photo', photos } : undefined;
  }
  if (value['kind'] === 'youtube' && typeof value['video'] === 'string') {
    return { kind: 'youtube', video: value['video'] };
  }
  if (value['kind'] === 'cloudinary' && typeof value['publicId'] === 'string') {
    return { kind: 'cloudinary', publicId: value['publicId'] };
  }
  return undefined;
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

  const media = mediaFrom(data['media']);
  return media === undefined
    ? { createdAt, from, id, message }
    : { createdAt, from, id, media, message };
}
