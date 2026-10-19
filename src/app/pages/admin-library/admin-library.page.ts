import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ProfilePhotoSettingComponent } from '@features/admin/components/profile-photo-setting/profile-photo-setting.component';
import { SetLibraryComponent } from '@features/admin/components/set-library/set-library.component';
import { useNoIndex } from '@shared/utils/use-noindex';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfilePhotoSettingComponent, SetLibraryComponent],
  selector: 'app-admin-library-page',
  styleUrl: './admin-library.page.css',
  templateUrl: './admin-library.page.html',
})
export class AdminLibraryPageComponent {
  constructor() {
    useNoIndex();
  }
}
