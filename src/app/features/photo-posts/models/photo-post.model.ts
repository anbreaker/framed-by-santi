import { PostText } from './localized-text.model';
import { Photo } from './photo.model';

/** A post is a set of photos published together, like an Instagram carousel. */
export interface PhotoPost {
  caption: PostText;
  /** ISO date and time the set was created; breaks the tie between sets taken on the same day. */
  createdAt?: string;
  /** Optional text for the whole set, like an Instagram caption. */
  description?: PostText;
  id: string;
  /** Ordered set; the first photo is the cover. */
  photos: readonly Photo[];
  /** Ids of the themes this post belongs to, see `Theme`. */
  tags: readonly string[];
  /** ISO date (YYYY-MM-DD). */
  takenAt: string;
}
