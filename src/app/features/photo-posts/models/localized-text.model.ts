import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';

/** One text written once and translated: the same wording in every site language. */
export type LocalizedText = Readonly<Record<SupportedLang, string>>;

/** Posts saved before translations existed hold a plain string, which is shown in every language. */
export type PostText = LocalizedText | string;

/** Order tried when the active language has no text: the default language first. */
const FALLBACK_ORDER: readonly SupportedLang[] = ['en', 'es', 'pt'];

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const fields = value as Record<string, unknown>;
  return SUPPORTED_LANGS.every((lang) => typeof fields[lang] === 'string');
}

/** Narrows an untrusted value, such as a Firestore field, to a post text. */
export function parseText(value: unknown): PostText | null {
  if (typeof value === 'string') return value;
  return isLocalizedText(value) ? value : null;
}

/** The text in the active language, or the first language that has one. */
export function localize(text: PostText, lang: SupportedLang): string {
  if (typeof text === 'string') return text;

  return [lang, ...FALLBACK_ORDER].map((code) => text[code]).find((value) => value !== '') ?? '';
}
