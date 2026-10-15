import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';

import { Theme } from '@features/photo-posts/models/theme.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';

import { ThemesAdminError, ThemesAdminService } from '../../services/themes-admin.service';
import { TranslationError, TranslationService } from '../../services/translation.service';

export const MAX_THEME_NAME = 40;

const TRANSLATION_ERRORS: Record<TranslationError['reason'], string> = {
  failed: 'admin.editor.translate.errors.failed',
  limit: 'admin.editor.translate.errors.limit',
  'not-allowed': 'admin.editor.translate.errors.notAllowed',
};

const THEME_ERRORS: Record<ThemesAdminError['reason'], string> = {
  exists: 'admin.editor.themes.errors.exists',
  'invalid-name': 'admin.editor.themes.errors.invalidName',
  'not-configured': 'admin.editor.themes.errors.notConfigured',
  'request-failed': 'admin.editor.themes.errors.failed',
};

/** Creates a gallery theme from one name, written in any language: it is translated into the others, saved and offered right away. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, TranslocoDirective],
  selector: 'app-theme-creator',
  styleUrl: './theme-creator.component.css',
  templateUrl: './theme-creator.component.html',
})
export class ThemeCreatorComponent {
  private readonly store = inject(PhotoPostsStore);
  private readonly themes = inject(ThemesAdminService);
  private readonly translation = inject(TranslationService);

  readonly created = output<Theme>();

  protected readonly errorKey = signal<string | null>(null);

  private readonly model = signal({ name: '' });

  protected readonly maxName = MAX_THEME_NAME;
  protected readonly themeForm = form(this.model, (path) => {
    required(path.name);
    maxLength(path.name, MAX_THEME_NAME);
  });
  protected readonly working = signal(false);

  protected async create(): Promise<void> {
    const name = this.model().name.trim();
    if (name === '' || this.working()) return;

    this.working.set(true);
    this.errorKey.set(null);

    try {
      const translated = await this.translation.translate('auto', [name]);
      const theme = await this.themes.create({
        en: translated.en[0],
        es: translated.es[0],
        pt: translated.pt[0],
      });

      this.store.addTheme(theme);
      this.created.emit(theme);
      this.model.set({ name: '' });
    } catch (error) {
      this.errorKey.set(
        error instanceof ThemesAdminError
          ? THEME_ERRORS[error.reason]
          : TRANSLATION_ERRORS[error instanceof TranslationError ? error.reason : 'failed']
      );
    } finally {
      this.working.set(false);
    }
  }
}
