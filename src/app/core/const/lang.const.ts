export const SUPPORTED_LANGS = ['en', 'es', 'pt'] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: SupportedLang = 'en';

export const LANG_STORAGE_KEY = 'framed-lang';

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};
