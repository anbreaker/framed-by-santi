import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { AdminSessionStore } from '@features/auth/store/admin-session.store';

/** Moves between the admin sections: the library of sets, the site settings and the friends' messages. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, TranslocoDirective],
  selector: 'app-admin-nav',
  styleUrl: './admin-nav.component.css',
  templateUrl: './admin-nav.component.html',
})
export class AdminNavComponent {
  /** The owner also gets the page where the messages are written. */
  protected readonly isOwner = inject(AdminSessionStore).isOwner;

  /**
   * On a phone the row of sections scrolls sideways; the open one is brought to its middle, so it is in
   * view on arrival. On a wide screen the sections are a column and nothing scrolls.
   */
  protected reveal(link: HTMLElement): void {
    const row = link.parentElement;
    if (!row) return;

    const rowBox = row.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    row.scrollLeft += linkBox.left - rowBox.left - (rowBox.width - linkBox.width) / 2;
  }
}
