import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PROFILE_PHOTO, PROFILE_PHOTO_SOURCE } from '@features/about/const/profile-photo.const';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { SiteSettingsAdminService } from '../../services/site-settings-admin.service';
import { PhotoRejectedError, preparePhoto } from '../../utils/prepare-photo';
import { IMAGE_CODEC, UPLOAD_ERROR_KEYS } from '../upload-panel/upload-panel.component';

type Status = 'idle' | 'saved' | 'working';

/** Lets the admin change the About portrait: upload a photo and save it in the site settings. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, TranslocoDirective],
  selector: 'app-profile-photo-setting',
  styleUrl: './profile-photo-setting.component.css',
  templateUrl: './profile-photo-setting.component.html',
})
export class ProfilePhotoSettingComponent {
  private readonly codec = inject(IMAGE_CODEC);
  private readonly settings = inject(SiteSettingsStore);
  private readonly settingsAdmin = inject(SiteSettingsAdminService);
  private readonly uploads = inject(PhotoUploadService);

  protected readonly errorKey = signal<string | null>(null);
  protected readonly status = signal<Status>('idle');
  protected readonly photo = computed(() => this.settings.profilePhoto() ?? PROFILE_PHOTO);
  protected readonly source = computed(() =>
    this.settings.profilePhoto() === null ? PROFILE_PHOTO_SOURCE : null
  );

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined || this.status() === 'working') return;

    this.errorKey.set(null);
    this.status.set('working');

    let photo: Photo;
    try {
      const prepared = await preparePhoto(file, this.codec);
      const uploaded = await this.uploads.upload(prepared.blob);
      photo = {
        alt: PROFILE_PHOTO.alt,
        height: uploaded.height,
        id: uploaded.publicId,
        publicId: uploaded.publicId,
        width: uploaded.width,
      };
    } catch (error) {
      this.fail(
        error instanceof PhotoRejectedError || error instanceof PhotoUploadError
          ? UPLOAD_ERROR_KEYS[error.reason]
          : UPLOAD_ERROR_KEYS['upload-failed']
      );
      return;
    }

    try {
      await this.settingsAdmin.saveProfilePhoto(photo);
    } catch {
      this.fail('admin.settings.profilePhoto.saveFailed');
      return;
    }

    this.settings.setProfilePhoto(photo);
    this.status.set('saved');
  }

  private fail(key: string): void {
    this.errorKey.set(key);
    this.status.set('idle');
  }
}
