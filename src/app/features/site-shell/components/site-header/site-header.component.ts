import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

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
  protected readonly menuOpen = signal(false);

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }
}
