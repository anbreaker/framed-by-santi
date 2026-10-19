import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AdminNavComponent } from '../admin-nav/admin-nav.component';

/** The admin layout: the sections in a sidebar and the open section beside them. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminNavComponent],
  selector: 'app-admin-shell',
  styleUrl: './admin-shell.component.css',
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {}
