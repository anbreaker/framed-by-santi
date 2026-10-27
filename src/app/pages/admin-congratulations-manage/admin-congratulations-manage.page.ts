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
import {
  PhotoUploadError,
  PhotoUploadService,
} from '@features/admin/services/photo-upload.service';
import {
  CongratulationFormComponent,
  CongratulationFormValue,
  MediaEntry,
} from '@features/congratulations/components/congratulation-form/congratulation-form.component';
import {
  Congratulation,
  CongratulationMedia,
  photoMedia,
} from '@features/congratulations/models/congratulation.model';
import { CongratulationsStore } from '@features/congratulations/store/congratulations.store';
import { mediaThumbnail } from '@features/congratulations/utils/media-thumbnail';
import { useNoIndex } from '@shared/utils/use-noindex';

type Notice = { key: string; kind: 'error' | 'info'; params?: Record<string, string> };

/** One part of the summary of a card, such as "3 photos", as a translation key and its count. */
type SummaryPart = { key: string; n: number };

/** What a message holds, for its card: "2 photos · 1 video", or text only. */
function summaryOf(media: readonly CongratulationMedia[]): SummaryPart[] {
  const photos = media.filter((item) => item.kind === 'photo').length;
  const videos = media.length - photos;
  const parts: SummaryPart[] = [];

  if (photos > 0) parts.push({ key: photos === 1 ? 'photo' : 'photos', n: photos });
  if (videos > 0) parts.push({ key: videos === 1 ? 'video' : 'videos', n: videos });
  return parts.length > 0 ? parts : [{ key: 'none', n: 0 }];
}

/**
 * A file that could not reach Cloudinary, told apart from a save that Firestore refused, with the reason
 * Cloudinary gave when it gave one.
 */
class UploadFailed extends Error {
  constructor(
    readonly fileName: string,
    readonly detail: string | null
  ) {
    super('upload-failed');
  }
}

/** What to say about a failed save: the file and Cloudinary's reason when an upload was refused. */
function failureNotice(error: unknown): Notice {
  if (!(error instanceof UploadFailed)) return { key: 'status.saveFailed', kind: 'error' };

  return error.detail === null
    ? { key: 'status.uploadFailed', kind: 'error' }
    : {
        key: 'status.uploadRefused',
        kind: 'error',
        params: { name: error.fileName, reason: error.detail.replace(/\.$/, '') },
      };
}

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
    this.store.items().map((item) => ({
      ...item,
      summary: summaryOf(item.media),
      thumbnail: mediaThumbnail(item.media),
    }))
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
      const media = await this.mediaFor(value.media);
      await this.store.save({ from: value.from, media, message: value.message }, editing?.id);

      this.editing.set(null);
      this.resetKey.update((key) => key + 1);
      this.notice.set({ key: 'status.saved', kind: 'info' });
    } catch (error) {
      this.notice.set(failureNotice(error));
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

  /**
   * Uploads the new photos and videos one after another, in order, so a failed upload stops before
   * sending the rest; media already saved or ready, like a YouTube link, is kept as it is.
   */
  private async mediaFor(entries: readonly MediaEntry[]): Promise<CongratulationMedia[]> {
    const media: CongratulationMedia[] = [];
    for (const entry of entries) media.push(await this.itemFor(entry));
    return media;
  }

  private async itemFor(entry: MediaEntry): Promise<CongratulationMedia> {
    if (entry.kind === 'ready') return entry.media;

    if (entry.kind === 'video') {
      const uploaded = await this.upload(entry.file, () => this.uploads.uploadVideo(entry.file));
      return { kind: 'cloudinary', publicId: uploaded.publicId };
    }

    const uploaded = await this.upload(entry.file, () => this.uploads.upload(entry.file));
    return photoMedia(
      {
        alt: entry.alt,
        height: uploaded.height,
        id: uploaded.publicId,
        publicId: uploaded.publicId,
        width: uploaded.width,
      },
      entry.whole
    );
  }

  private async upload<T>(file: File, send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      throw new UploadFailed(file.name, error instanceof PhotoUploadError ? error.detail : null);
    }
  }
}
