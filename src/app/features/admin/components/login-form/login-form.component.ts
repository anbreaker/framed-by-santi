import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { AuthStore } from '@features/auth/store/auth.store';

type Notice = { key: string; kind: 'error' | 'info' };

export const ADMIN_HOME_URL = '/admin/dashboard';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-login-form',
  styleUrl: './login-form.component.css',
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly notice = signal<Notice | null>(null);
  protected readonly password = signal('');
  protected readonly passwordShown = signal(false);
  protected readonly submitting = signal(false);
  protected readonly unavailable = computed(() => this.authStore.status() === 'unavailable');

  constructor() {
    void this.skipLoginWhenAdmin();
  }

  protected onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected togglePassword(): void {
    this.passwordShown.update((shown) => !shown);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.submitting() || this.unavailable()) return;

    if (this.email().trim() === '' || this.password() === '') {
      this.notice.set({ key: 'admin.login.missing', kind: 'error' });
      return;
    }

    this.submitting.set(true);
    this.notice.set(null);

    try {
      await this.authStore.signIn(this.email().trim(), this.password());

      if (this.authStore.isAdmin()) {
        await this.router.navigateByUrl(ADMIN_HOME_URL);
        return;
      }

      // A signed-in account that is not an admin gets the same answer as a wrong password.
      await this.authStore.signOut();
    } catch {
      // Wrong credentials, network and Firebase errors all end in the same generic message.
    } finally {
      this.submitting.set(false);
    }

    this.notice.set({ key: 'admin.login.failed', kind: 'error' });
  }

  protected async resetPassword(): Promise<void> {
    if (this.email().trim() === '') {
      this.notice.set({ key: 'admin.login.emailFirst', kind: 'error' });
      return;
    }

    try {
      await this.authStore.sendPasswordReset(this.email().trim());
    } catch {
      // Same answer whether or not the address exists, so the form does not reveal who can sign in.
    }

    this.notice.set({ key: 'admin.login.resetSent', kind: 'info' });
  }

  private async skipLoginWhenAdmin(): Promise<void> {
    await this.authStore.whenReady();

    if (this.authStore.isAdmin()) {
      await this.router.navigateByUrl(ADMIN_HOME_URL);
    }
  }
}
