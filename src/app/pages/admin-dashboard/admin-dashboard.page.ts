import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { AuthStore } from '@features/auth/store/auth.store';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-admin-dashboard-page',
  styleUrl: './admin-dashboard.page.css',
  templateUrl: './admin-dashboard.page.html',
})
export class AdminDashboardPageComponent implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly robots = this.meta.addTag({ content: 'noindex, nofollow', name: 'robots' });

  ngOnDestroy(): void {
    if (this.robots) this.meta.removeTagElement(this.robots);
  }

  protected async signOut(): Promise<void> {
    await this.authStore.signOut();
    await this.router.navigateByUrl('/admin');
  }
}
