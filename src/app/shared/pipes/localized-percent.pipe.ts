import { Pipe, PipeTransform } from '@angular/core';

import { LOCALE_BY_LANG, SupportedLang } from '@core/const/lang.const';

/** Formats a ratio such as `2.5` as a percentage with the conventions of the site language. */
@Pipe({ name: 'localizedPercent' })
export class LocalizedPercentPipe implements PipeTransform {
  transform(ratio: number, lang: SupportedLang): string {
    return new Intl.NumberFormat(LOCALE_BY_LANG[lang], {
      maximumFractionDigits: 0,
      style: 'percent',
    }).format(ratio);
  }
}
