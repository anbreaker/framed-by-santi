import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LANG_LABELS } from '@core/const/lang.const';
import { LanguageStore } from '@core/store/language.store';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-lang-selector',
  styleUrl: './lang-selector.component.css',
  templateUrl: './lang-selector.component.html',
})
export class LangSelectorComponent {
  protected readonly languageStore = inject(LanguageStore);

  protected readonly labels = LANG_LABELS;
}
