import { Photo } from './photo.model';
import { PostTag } from './post-tag.model';

/** A post is a set of photos published together, like an Instagram carousel. */
export interface PhotoPost {
  caption: string;
  /** Optional text for the whole set, like an Instagram caption. */
  description?: string;
  /** Free-form hashtags as typed by the author, without the leading `#`. Not the filter tags. */
  hashtags?: readonly string[];
  id: string;
  /** Ordered set; the first photo is the cover. */
  photos: readonly Photo[];
  tags: readonly PostTag[];
  /** ISO date (YYYY-MM-DD). */
  takenAt: string;
}
