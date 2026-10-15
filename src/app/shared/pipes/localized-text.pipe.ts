import { Pipe, PipeTransform } from '@angular/core';

import { SupportedLang } from '@core/const/lang.const';
import { localize, PostText } from '@features/photo-posts/models/localized-text.model';

/**
 * Shows a post text in the language selected on the site.
 * Pass the active language as an argument so the pure pipe re-runs when the language changes.
 */
@Pipe({ name: 'localizedText' })
export class LocalizedTextPipe implements PipeTransform {
  transform(text: PostText | undefined, lang: SupportedLang): string {
    return text === undefined ? '' : localize(text, lang);
  }
}
