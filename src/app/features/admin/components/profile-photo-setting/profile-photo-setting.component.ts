import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  InjectionToken,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PROFILE_PHOTO } from '@features/about/const/profile-photo.const';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { portraitFor } from '@features/site-settings/utils/portrait';
import { TimeoutError, withTimeout } from '@shared/utils/with-timeout';

import { PhotoUploadError, PhotoUploadService } from '../../services/photo-upload.service';
import { SiteSettingsAdminService } from '../../services/site-settings-admin.service';
import { PhotoRejectedError, preparePhoto } from '../../utils/prepare-photo';
import {
  IMAGE_CODEC,
  PREVIEW_MAKER,
  UPLOAD_ERROR_KEYS,
} from '../upload-panel/upload-panel.component';

type Status = 'idle' | 'saved' | 'saving' | 'uploading';

/** How long the upload and the save may take before the admin is told something is wrong. */
export const PROFILE_PHOTO_TIMEOUTS = new InjectionToken<{ save: number; upload: number }>(
  'PROFILE_PHOTO_TIMEOUTS',
  // A large photo on a slow connection can take a while to upload; a save is one small write.
  { factory: (): { save: number; upload: number } => ({ save: 20_000, upload: 120_000 }) }
);

const TIMEOUT_KEY = 'admin.settings.profilePhoto.timeout';

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
  private readonly previewMaker = inject(PREVIEW_MAKER);
  private readonly timeouts = inject(PROFILE_PHOTO_TIMEOUTS);
  private readonly settings = inject(SiteSettingsStore);
  private readonly settingsAdmin = inject(SiteSettingsAdminService);
  private readonly uploads = inject(PhotoUploadService);
  /** Counts the photos chosen, so a slow preview of an earlier one is never shown. */
  private choice = 0;

  protected readonly errorKey = signal<string | null>(null);
  /** The chosen file, shown at once while it uploads and saves. */
  protected readonly preview = signal<string | null>(null);
  protected readonly status = signal<Status>('idle');
  protected readonly busy = computed(
    () => this.status() === 'uploading' || this.status() === 'saving'
  );
  protected readonly portrait = computed(() => portraitFor(this.settings.profilePhoto()));

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined || this.busy()) return;

    this.errorKey.set(null);
    this.status.set('uploading');
    void this.showPreview(file, ++this.choice);

    let photo: Photo;
    try {
      const prepared = await preparePhoto(file, this.codec);
      const uploaded = await withTimeout(this.uploads.upload(prepared.blob), this.timeouts.upload);
      photo = {
        alt: PROFILE_PHOTO.alt,
        height: uploaded.height,
        id: uploaded.publicId,
        publicId: uploaded.publicId,
        width: uploaded.width,
      };
    } catch (error) {
      this.fail(
        error instanceof TimeoutError
          ? TIMEOUT_KEY
          : error instanceof PhotoRejectedError || error instanceof PhotoUploadError
            ? UPLOAD_ERROR_KEYS[error.reason]
            : UPLOAD_ERROR_KEYS['upload-failed']
      );
      return;
    }

    this.status.set('saving');
    try {
      await withTimeout(this.settingsAdmin.saveProfilePhoto(photo), this.timeouts.save);
    } catch (error) {
      // A slow save may still have gone through: ask the server before calling it a failure.
      const savedAnyway =
        error instanceof TimeoutError && (await this.settingsAdmin.isProfilePhotoSaved(photo.id));
      if (!savedAnyway) {
        this.fail(
          error instanceof TimeoutError ? TIMEOUT_KEY : 'admin.settings.profilePhoto.saveFailed'
        );
        return;
      }
    }

    this.settings.setProfilePhoto(photo);
    this.clearPreview();
    this.status.set('saved');
  }

  /** Shows a small version of the chosen file; without one the frame keeps the current portrait. */
  private async showPreview(file: File, choice: number): Promise<void> {
    let url: string;
    try {
      url = await this.previewMaker(file);
    } catch {
      return;
    }

    // The upload may be over by now, or another photo may have been chosen meanwhile.
    if (choice === this.choice && this.busy()) {
      this.preview.set(url);
    } else {
      URL.revokeObjectURL(url);
    }
  }

  private clearPreview(): void {
    const url = this.preview();
    if (url !== null) URL.revokeObjectURL(url);
    this.preview.set(null);
  }

  private fail(key: string): void {
    this.clearPreview();
    this.errorKey.set(key);
    this.status.set('idle');
  }
}
