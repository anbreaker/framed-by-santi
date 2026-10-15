import { Photo } from '../models/photo.model';

/** Moves one photo to a new position; an out-of-range or no-op move returns the same order. */
export function movePhoto(photos: readonly Photo[], from: number, to: number): readonly Photo[] {
  const inRange = (index: number): boolean => index >= 0 && index < photos.length;

  if (from === to || !inRange(from) || !inRange(to)) return photos;

  const next = [...photos];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The first photo is the cover, so choosing a cover is moving that photo to the front. */
export function makeCover(photos: readonly Photo[], index: number): readonly Photo[] {
  return movePhoto(photos, index, 0);
}
