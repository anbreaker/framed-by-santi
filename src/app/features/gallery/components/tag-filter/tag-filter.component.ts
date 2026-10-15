import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { Theme } from '@features/photo-posts/models/theme.model';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

/** Theme filters as links to `?tag=`, so the filter survives reloads, sharing and back navigation. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedTextPipe, RouterLink, TranslocoDirective],
  selector: 'app-tag-filter',
  styleUrl: './tag-filter.component.css',
  templateUrl: './tag-filter.component.html',
})
export class TagFilterComponent {
  protected readonly lang = inject(LanguageStore).currentLang;
  readonly selected = input<string | null>(null);

  readonly themes = input.required<readonly Theme[]>();
}
