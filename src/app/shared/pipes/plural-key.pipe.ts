import { Pipe, PipeTransform } from '@angular/core';

import { LOCALE_BY_LANG, SupportedLang } from '@core/const/lang.const';

/**
 * Picks the translation key for a count using the language's plural rules.
 * Translations define `<baseKey>.one` and `<baseKey>.other`; every other plural category
 * (for example Spanish "many" for millions) falls back to `other`.
 *
 * Usage: `t(count | pluralKey: 'gallery.photoCount' : lang, { count })`
 */
@Pipe({ name: 'pluralKey' })
export class PluralKeyPipe implements PipeTransform {
  transform(count: number, baseKey: string, lang: SupportedLang): string {
    const category = new Intl.PluralRules(LOCALE_BY_LANG[lang]).select(count);
    return `${baseKey}.${category === 'one' ? 'one' : 'other'}`;
  }
}
