import { inject, Injectable } from '@angular/core';

import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';
import { AuthStore } from '@features/auth/store/auth.store';

export type TranslationFailure = 'failed' | 'limit' | 'not-allowed';

export class TranslationError extends Error {
  constructor(readonly reason: TranslationFailure) {
    super(reason);
    this.name = 'TranslationError';
  }
}

/** The same list of texts in every site language; the source language holds what the author wrote. */
export type TranslatedTexts = Record<SupportedLang, string[]>;

const isTranslatedTexts = (value: unknown, count: number): value is TranslatedTexts => {
  if (typeof value !== 'object' || value === null) return false;

  const fields = value as Record<string, unknown>;
  return SUPPORTED_LANGS.every((lang) => {
    const texts = fields[lang];
    return (
      Array.isArray(texts) &&
      texts.length === count &&
      texts.every((text) => typeof text === 'string')
    );
  });
};

/** Translates what the author wrote into the other site languages through `/api/translate` (DeepL, admins only). */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly authStore = inject(AuthStore);

  /** `auto` lets DeepL detect the language, so a text can be written in any of the site languages. */
  async translate(
    source: SupportedLang | 'auto',
    texts: readonly string[]
  ): Promise<TranslatedTexts> {
    if (texts.length === 0) return { en: [], es: [], pt: [] };

    const idToken = await this.authStore.getIdToken();
    if (idToken === null) throw new TranslationError('not-allowed');

    try {
      const response = await fetch('/api/translate', {
        body: JSON.stringify(source === 'auto' ? { texts } : { source, texts }),
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if ([401, 403].includes(response.status)) throw new TranslationError('not-allowed');
      if (response.status === 429) throw new TranslationError('limit');
      if (!response.ok) throw new TranslationError('failed');

      const { translations } = (await response.json()) as { translations?: unknown };
      if (!isTranslatedTexts(translations, texts.length)) throw new TranslationError('failed');

      return translations;
    } catch (error) {
      throw error instanceof TranslationError ? error : new TranslationError('failed');
    }
  }
}
