import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { AdminShellComponent } from '@features/admin/components/admin-shell/admin-shell.component';
import { CongratulationsCarouselComponent } from '@features/congratulations/components/congratulations-carousel/congratulations-carousel.component';
import { CongratulationsStore } from '@features/congratulations/store/congratulations.store';
import { useNoIndex } from '@shared/utils/use-noindex';

/** The friends' messages to Santi, only for the admins once they sign in. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminShellComponent, CongratulationsCarouselComponent, TranslocoDirective],
  selector: 'app-admin-congratulations-page',
  styleUrl: './admin-congratulations.page.css',
  templateUrl: './admin-congratulations.page.html',
})
export class AdminCongratulationsPageComponent {
  private readonly store = inject(CongratulationsStore);

  protected readonly messages = this.store.items;
  protected readonly status = this.store.status;

  constructor() {
    useNoIndex();
    void this.store.load();
  }
}
