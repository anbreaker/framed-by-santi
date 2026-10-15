export const SUPPORTED_LANGS = ['en', 'es', 'pt'] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: SupportedLang = 'en';

export const LANG_STORAGE_KEY = 'framed-lang';

/** Regional locale used by `Intl` for dates, numbers and plural rules in each site language. */
export const LOCALE_BY_LANG: Record<SupportedLang, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
};

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};
