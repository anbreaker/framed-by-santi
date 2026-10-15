import { SupportedLang } from '@core/const/lang.const';
import { Photo } from '@features/photo-posts/models/photo.model';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';

/** The same text written in each site language; blank means not written yet. */
export type LanguageTexts = Record<SupportedLang, string>;

export interface PostDraft {
  caption: LanguageTexts;
  description: LanguageTexts;
  /** Free text as typed, for example `#street nyc`. */
  hashtags: string;
  photos: readonly Photo[];
  tags: readonly string[];
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

const trimTexts = (texts: LanguageTexts): LanguageTexts => ({
  en: texts.en.trim(),
  es: texts.es.trim(),
  pt: texts.pt.trim(),
});

/** Turns what the author typed into a post. Photos without alt text get the first caption written, so none is left unlabelled. */
export function buildPost(draft: PostDraft, id = ''): PhotoPost {
  const caption = trimTexts(draft.caption);
  const description = trimTexts(draft.description);
  const hashtags = parseHashtags(draft.hashtags);
  const altText = caption.en || caption.es || caption.pt;

  return {
    caption,
    ...(Object.values(description).some((text) => text !== '') && { description }),
    ...(hashtags.length > 0 && { hashtags }),
    id,
    photos: draft.photos.map((photo) =>
      photo.alt.trim() === '' ? { ...photo, alt: altText } : photo
    ),
    tags: [...draft.tags],
    takenAt: draft.takenAt,
  };
}
