import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LangSelectorComponent } from '@shared/components/lang-selector/lang-selector.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LangSelectorComponent, TranslocoDirective],
  selector: 'app-home-page',
  styleUrl: './home.page.css',
  templateUrl: './home.page.html',
})
export class HomePageComponent {}
