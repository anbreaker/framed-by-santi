import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AdminNavComponent } from '@features/admin/components/admin-nav/admin-nav.component';
import { SetLibraryComponent } from '@features/admin/components/set-library/set-library.component';
import { useNoIndex } from '@shared/utils/use-noindex';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminNavComponent, SetLibraryComponent],
  selector: 'app-admin-library-page',
  styleUrl: './admin-library.page.css',
  templateUrl: './admin-library.page.html',
})
export class AdminLibraryPageComponent {
  constructor() {
    useNoIndex();
  }
}
