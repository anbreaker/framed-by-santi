import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { AuthStore } from '@features/auth/store/auth.store';

type Status = 'idle' | 'sending' | 'sent';

/**
 * Lets the signed-in admin change their own password: Firebase emails them a link to choose a new one,
 * so this site never handles passwords. The email always goes to the account that is signed in.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-password-setting',
  styleUrl: './password-setting.component.css',
  templateUrl: './password-setting.component.html',
})
export class PasswordSettingComponent {
  private readonly authStore = inject(AuthStore);

  protected readonly email = computed(() => this.authStore.user()?.email ?? null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly status = signal<Status>('idle');

  protected async send(): Promise<void> {
    const email = this.email();
    if (email === null || this.status() === 'sending') return;

    this.errorKey.set(null);
    this.status.set('sending');

    try {
      await this.authStore.sendPasswordReset(email);
      this.status.set('sent');
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      this.errorKey.set(
        code === 'auth/too-many-requests'
          ? 'admin.settings.password.tooMany'
          : 'admin.settings.password.failed'
      );
      this.status.set('idle');
    }
  }
}
