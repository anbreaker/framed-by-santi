import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { DEFAULT_LANG, SUPPORTED_LANGS } from '@core/const/lang.const';
import { withChunkLoadRecovery } from '@core/router/chunk-load-recovery';
import { I18nLoaderService } from '@core/services/i18n-loader.service';
import { prefetchTranslations } from '@core/utils/prefetch-translations';
import { skipSamePageTransitions } from '@core/utils/view-transition';
import { environment } from '@environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withXhr()),
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGS],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        prodMode: environment.production,
        reRenderOnLangChange: true,
      },
      loader: I18nLoaderService,
    }),
    provideAppInitializer(prefetchTranslations),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
      withComponentInputBinding(),
      withViewTransitions({ onViewTransitionCreated: skipSamePageTransitions }),
      withChunkLoadRecovery()
    ),
  ],
};
