import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { AdminShellComponent } from '@features/admin/components/admin-shell/admin-shell.component';
import { PhotoUploadService } from '@features/admin/services/photo-upload.service';
import {
  CongratulationFormComponent,
  CongratulationFormValue,
  PhotoEntry,
} from '@features/congratulations/components/congratulation-form/congratulation-form.component';
import {
  Congratulation,
  CongratulationMedia,
} from '@features/congratulations/models/congratulation.model';
import { CongratulationsStore } from '@features/congratulations/store/congratulations.store';
import { mediaThumbnail } from '@features/congratulations/utils/media-thumbnail';
import { Photo } from '@features/photo-posts/models/photo.model';
import { useNoIndex } from '@shared/utils/use-noindex';

type Notice = { key: string; kind: 'error' | 'info' };

/** A file that could not reach Cloudinary, told apart from a save that Firestore refused. */
class UploadFailed extends Error {}

/**
 * Where the owner writes the friends' messages: a form for a new one or the one being edited, and the list
 * of saved ones. The owner guard keeps everybody else out and the security rules refuse their writes.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminShellComponent, CongratulationFormComponent, RouterLink, TranslocoDirective],
  selector: 'app-admin-congratulations-manage-page',
  styleUrl: './admin-congratulations-manage.page.css',
  templateUrl: './admin-congratulations-manage.page.html',
})
export class AdminCongratulationsManagePageComponent {
  private readonly store = inject(CongratulationsStore);
  private readonly uploads = inject(PhotoUploadService);
  private readonly formTitle = viewChild<ElementRef<HTMLElement>>('formTitle');

  protected readonly confirming = signal<string | null>(null);
  protected readonly editing = signal<Congratulation | null>(null);
  protected readonly notice = signal<Notice | null>(null);
  protected readonly resetKey = signal(0);
  protected readonly saving = signal(false);

  protected readonly status = this.store.status;
  protected readonly cards = computed(() =>
    this.store.items().map((item) => ({ ...item, thumbnail: mediaThumbnail(item.media) }))
  );

  constructor() {
    useNoIndex();
    void this.store.load();
  }

  protected async save(value: CongratulationFormValue): Promise<void> {
    const editing = this.editing();
    this.saving.set(true);
    this.notice.set(null);

    try {
      const media = await this.mediaFor(value, editing);
      await this.store.save(
        media === undefined
          ? { from: value.from, message: value.message }
          : { from: value.from, media, message: value.message },
        editing?.id
      );

      this.editing.set(null);
      this.resetKey.update((key) => key + 1);
      this.notice.set({ key: 'status.saved', kind: 'info' });
    } catch (error) {
      this.notice.set({
        key: error instanceof UploadFailed ? 'status.uploadFailed' : 'status.saveFailed',
        kind: 'error',
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected edit(item: Congratulation): void {
    this.editing.set(item);
    this.confirming.set(null);
    this.notice.set(null);

    const title = this.formTitle()?.nativeElement;
    title?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    title?.focus({ preventScroll: true });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.resetKey.update((key) => key + 1);
  }

  protected askToRemove(id: string): void {
    this.confirming.set(id);
  }

  protected keep(): void {
    this.confirming.set(null);
  }

  protected async remove(item: Congratulation): Promise<void> {
    this.confirming.set(null);

    try {
      await this.store.remove(item.id);
      if (this.editing()?.id === item.id) this.cancelEdit();
      this.notice.set({ key: 'status.deleted', kind: 'info' });
    } catch {
      this.notice.set({ key: 'status.deleteFailed', kind: 'error' });
    }
  }

  /** Uploads the new files; otherwise keeps the media already saved, the photos with their new descriptions. */
  private async mediaFor(
    value: CongratulationFormValue,
    editing: Congratulation | null
  ): Promise<CongratulationMedia | undefined> {
    const saved = editing?.media;

    switch (value.kind) {
      case 'youtube':
        return { kind: 'youtube', video: value.youtube };
      case 'photo': {
        // One after another, so a failed upload stops before sending the rest.
        const photos: Photo[] = [];
        for (const entry of value.photos) photos.push(await this.photoFor(entry));
        return photos.length > 0 ? { kind: 'photo', photos } : undefined;
      }
      case 'cloudinary': {
        if (value.file === null) return saved?.kind === 'cloudinary' ? saved : undefined;
        const uploaded = await this.upload(() => this.uploads.uploadVideo(value.file as File));
        return { kind: 'cloudinary', publicId: uploaded.publicId };
      }
      default:
        return undefined;
    }
  }

  private async photoFor(entry: PhotoEntry): Promise<Photo> {
    if (entry.kind === 'saved') return { ...entry.photo, alt: entry.alt };

    const uploaded = await this.upload(() => this.uploads.upload(entry.file));
    return {
      alt: entry.alt,
      height: uploaded.height,
      id: uploaded.publicId,
      publicId: uploaded.publicId,
      width: uploaded.width,
    };
  }

  private async upload<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch {
      throw new UploadFailed();
    }
  }
}
