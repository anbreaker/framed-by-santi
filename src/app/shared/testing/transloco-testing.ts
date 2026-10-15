import { ModuleWithProviders } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../public/assets/i18n/en.json';
import es from '../../../../public/assets/i18n/es.json';
import pt from '../../../../public/assets/i18n/pt.json';

/** Transloco for specs, loaded with the real translation files so missing keys fail the tests. */
export const realTranslations = (): ModuleWithProviders<TranslocoTestingModule> =>
  TranslocoTestingModule.forRoot({
    langs: { en, es, pt },
    translocoConfig: {
      availableLangs: ['en', 'es', 'pt'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
    },
  });
