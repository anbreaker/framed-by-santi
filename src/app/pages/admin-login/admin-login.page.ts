import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { LoginFormComponent } from '@features/admin/components/login-form/login-form.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginFormComponent],
  selector: 'app-admin-login-page',
  styleUrl: './admin-login.page.css',
  templateUrl: './admin-login.page.html',
})
export class AdminLoginPageComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly robots = this.meta.addTag({ content: 'noindex, nofollow', name: 'robots' });

  ngOnDestroy(): void {
    if (this.robots) this.meta.removeTagElement(this.robots);
  }
}
