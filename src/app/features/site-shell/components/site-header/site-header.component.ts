import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { AuthStore } from '@features/auth/store/auth.store';
import { LangSelectorComponent } from '@shared/components/lang-selector/lang-selector.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LangSelectorComponent, RouterLink, RouterLinkActive, TranslocoDirective],
  selector: 'app-site-header',
  styleUrl: './site-header.component.css',
  templateUrl: './site-header.component.html',
  host: { '(keydown.escape)': 'closeMenu()' },
})
export class SiteHeaderComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Only a signed-in admin sees the sign out button; visitors never see anything about accounts. */
  protected readonly isAdmin = this.authStore.isAdmin;
  protected readonly menuOpen = signal(false);

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async signOut(): Promise<void> {
    this.closeMenu();
    await this.authStore.signOut();
    await this.router.navigateByUrl('/');
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }
}
