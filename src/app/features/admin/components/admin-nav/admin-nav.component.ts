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
}
