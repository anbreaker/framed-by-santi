import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { AdminShellComponent } from '@features/admin/components/admin-shell/admin-shell.component';
import { PasswordSettingComponent } from '@features/admin/components/password-setting/password-setting.component';
import { ProfilePhotoSettingComponent } from '@features/admin/components/profile-photo-setting/profile-photo-setting.component';
import { useNoIndex } from '@shared/utils/use-noindex';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminShellComponent,
    PasswordSettingComponent,
    ProfilePhotoSettingComponent,
    TranslocoDirective,
  ],
  selector: 'app-admin-settings-page',
  styleUrl: './admin-settings.page.css',
  templateUrl: './admin-settings.page.html',
})
export class AdminSettingsPageComponent {
  constructor() {
    useNoIndex();
  }
}
