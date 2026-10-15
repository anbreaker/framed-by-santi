import { Photo } from '@features/photo-posts/models/photo.model';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PostTag } from '@features/photo-posts/models/post-tag.model';

export interface PostDraft {
  caption: string;
  description: string;
  /** Free text as typed, for example `#street nyc`. */
  hashtags: string;
  photos: readonly Photo[];
  tags: readonly PostTag[];
  takenAt: string;
}

/** Hashtags typed as free text: split on spaces and commas, without `#` and without repeats (ignoring case, the first spelling wins). */
export function parseHashtags(text: string): string[] {
  const words = text
    .split(/[\s,]+/)
    .map((word) => word.replace(/^#+/, ''))
    .filter((word) => word !== '');

  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Local date as `YYYY-MM-DD`, the format posts store in `takenAt`. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Turns what the author typed into a post. Photos without alt text get the caption, so none is left unlabelled. */
export function buildPost(draft: PostDraft, id = ''): PhotoPost {
  const caption = draft.caption.trim();
  const description = draft.description.trim();
  const hashtags = parseHashtags(draft.hashtags);

  return {
    caption,
    ...(description !== '' && { description }),
    ...(hashtags.length > 0 && { hashtags }),
    id,
    photos: draft.photos.map((photo) =>
      photo.alt.trim() === '' ? { ...photo, alt: caption } : photo
    ),
    tags: [...draft.tags],
    takenAt: draft.takenAt,
  };
}
