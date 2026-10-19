import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';
import { PostText } from '@features/photo-posts/models/localized-text.model';

import { TranslatedTexts } from '../services/translation.service';
import { LanguageTexts } from './post-draft';

/** The texts of a set that exist in every site language. */
export interface PostTexts {
  caption: LanguageTexts;
  description: LanguageTexts;
}

export type Translate = (source: 'auto', texts: readonly string[]) => Promise<TranslatedTexts>;

const emptyTexts = (): LanguageTexts => ({ en: '', es: '', pt: '' });

/** A text from before translations is one string; it goes in English, so publishing can translate the rest. */
export const toLanguageTexts = (text: PostText | undefined): LanguageTexts =>
  text === undefined
    ? emptyTexts()
    : typeof text === 'string'
      ? { ...emptyTexts(), en: text }
      : { ...text };

/**
 * Translates what the author left empty, so a published set has its texts in every language. It fills
 * only blank languages and never replaces what was written. Returns the same object when there was
 * nothing to translate, and throws when the translation failed.
 */
export async function fillMissingLanguages(
  texts: PostTexts,
  translate: Translate,
  preferred?: SupportedLang
): Promise<PostTexts> {
  const items = (['caption', 'description'] as const).flatMap((field) => {
    const fieldTexts = texts[field];
    const written = [...(preferred === undefined ? [] : [preferred]), ...SUPPORTED_LANGS]
      .map((lang) => fieldTexts[lang])
      .find((text) => text.trim() !== '');
    const someEmpty = SUPPORTED_LANGS.some((lang) => fieldTexts[lang].trim() === '');

    return written !== undefined && someEmpty ? [{ field, text: written }] : [];
  });

  if (items.length === 0) return texts;

  const result = await translate(
    'auto',
    items.map((item) => item.text)
  );
  const filled: PostTexts = {
    caption: { ...texts.caption },
    description: { ...texts.description },
  };

  items.forEach(({ field }, index) => {
    SUPPORTED_LANGS.filter((lang) => filled[field][lang].trim() === '').forEach((lang) => {
      filled[field][lang] = result[lang][index];
    });
  });

  return filled;
}
