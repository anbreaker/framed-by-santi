import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { SUPPORTED_LANGS, SupportedLang } from '@core/const/lang.const';

/** Picks the language of the texts being written; languages that still miss text carry a dot. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-lang-tabs',
  styleUrl: './lang-tabs.component.css',
  templateUrl: './lang-tabs.component.html',
})
export class LangTabsComponent {
  readonly active = model.required<SupportedLang>();
  readonly missing = input<readonly SupportedLang[]>([]);

  protected readonly langs = SUPPORTED_LANGS;
}
