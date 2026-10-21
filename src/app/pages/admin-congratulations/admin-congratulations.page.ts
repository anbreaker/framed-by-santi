import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { AdminShellComponent } from '@features/admin/components/admin-shell/admin-shell.component';
import { CongratulationsCarouselComponent } from '@features/congratulations/components/congratulations-carousel/congratulations-carousel.component';
import { CONGRATULATIONS } from '@features/congratulations/data/congratulations.data';
import { useNoIndex } from '@shared/utils/use-noindex';

/** The friends' messages to Santi, only for him once he signs in. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminShellComponent, CongratulationsCarouselComponent, TranslocoDirective],
  selector: 'app-admin-congratulations-page',
  styleUrl: './admin-congratulations.page.css',
  templateUrl: './admin-congratulations.page.html',
})
export class AdminCongratulationsPageComponent {
  protected readonly messages = inject(CONGRATULATIONS);

  constructor() {
    useNoIndex();
  }
}
