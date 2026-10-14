import { Pipe, PipeTransform } from '@angular/core';

import { LOCALE_BY_LANG, SupportedLang } from '@core/const/lang.const';

export type LocalizedDateStyle = 'long' | 'short';

/**
 * Formats an ISO date (`YYYY-MM-DD`) in the language selected on the site, not the browser's.
 * Pass the active language as an argument so the pure pipe re-runs when the language changes.
 */
@Pipe({ name: 'localizedDate' })
export class LocalizedDatePipe implements PipeTransform {
  transform(isoDate: string, lang: SupportedLang, style: LocalizedDateStyle = 'short'): string {
    if (!isoDate) return '';

    // Local midnight keeps the same calendar day in every time zone
    const date = new Date(`${isoDate}T00:00:00`);
    return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], {
      day: 'numeric',
      month: style === 'long' ? 'long' : 'short',
      year: 'numeric',
    }).format(date);
  }
}
