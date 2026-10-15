import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  InjectionToken,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  PhotoUploadError,
  PhotoUploadService,
  UploadedPhoto,
} from '../../services/photo-upload.service';
import { browserImageCodec } from '../../utils/browser-image-codec';
import { makePreview } from '../../utils/browser-preview';
import {
  ImageCodec,
  MAX_LONG_EDGE,
  PhotoRejectedError,
  PhotoWarning,
  preparePhoto,
} from '../../utils/prepare-photo';

/** Makes the small preview shown while a photo uploads; replaced in tests. */
export const PREVIEW_MAKER = new InjectionToken<(file: File) => Promise<string>>('PREVIEW_MAKER', {
  factory: (): ((file: File) => Promise<string>) => makePreview,
});

export const IMAGE_CODEC = new InjectionToken<ImageCodec>('IMAGE_CODEC', {
  factory: (): ImageCodec => browserImageCodec,
});

type UploadStatus = 'done' | 'failed' | 'preparing' | 'uploading';

/** A file the moment it is accepted: it can be previewed locally while it is prepared and uploaded. */
export interface QueuedPhoto {
  localId: number;
  name: string;
  /** Empty: the preview is not ready yet and arrives later as `previewReady`. */
  previewUrl: string;
}

/** The small preview of a queued file, once it has been made. */
export interface PreviewReady {
  localId: number;
  previewUrl: string;
}

/** The end of one file: the uploaded photo, or no result when preparing or uploading failed. */
export interface FinishedPhoto {
  localId: number;
  result: UploadedPhoto | null;
}

export interface UploadItem {
  errorKey: string | null;
  id: number;
  name: string;
  result: UploadedPhoto | null;
  status: UploadStatus;
  warnings: PhotoWarning[];
}

const ERROR_KEYS: Record<PhotoRejectedError['reason'] | PhotoUploadError['reason'], string> = {
  'not-allowed': 'admin.upload.errors.notAllowed',
  'sign-failed': 'admin.upload.errors.signFailed',
  'too-large': 'admin.upload.errors.tooLarge',
  unreadable: 'admin.upload.errors.unreadable',
  'unsupported-type': 'admin.upload.errors.unsupportedType',
  'upload-failed': 'admin.upload.errors.uploadFailed',
};

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-upload-panel',
  styleUrl: './upload-panel.component.css',
  templateUrl: './upload-panel.component.html',
})
export class UploadPanelComponent {
  private readonly codec = inject(IMAGE_CODEC);
  private readonly previewMaker = inject(PREVIEW_MAKER);
  /** Previews are made one after another, so many large photos never decode at the same time. */
  private readonly uploads = inject(PhotoUploadService);
  private previews: Promise<void> = Promise.resolve();

  private nextId = 0;
  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');

  readonly finished = output<FinishedPhoto>();
  /** Emits each file right away, before any upload, so the editor can show it from the local file. */
  readonly previewReady = output<PreviewReady>();
  readonly queued = output<QueuedPhoto>();

  protected readonly items = signal<readonly UploadItem[]>([]);
  protected readonly maxLongEdge = MAX_LONG_EDGE;

  /** Opens the file chooser; the editor calls it from its own "add photos" buttons. */
  openPicker(): void {
    this.picker().nativeElement.click();
  }

  protected async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    input.value = '';

    await this.addFiles(files);
  }

  /** Prepares and uploads files, whether they were chosen in the file chooser or dropped on the viewer. */
  async addFiles(files: readonly File[]): Promise<void> {
    const added = files.map<UploadItem>((file) => ({
      errorKey: null,
      id: this.nextId++,
      name: file.name,
      result: null,
      status: 'preparing',
      warnings: [],
    }));
    this.items.update((current) => [...current, ...added]);
    added.forEach((item, index) => {
      this.queued.emit({ localId: item.id, name: item.name, previewUrl: '' });
      this.queuePreview(item.id, files[index]);
    });

    // The previews go first: seeing the photos matters more than starting to upload them.
    await this.previews;

    // One photo at a time keeps memory and bandwidth predictable on a phone.
    for (const [index, file] of files.entries()) {
      await this.process(added[index].id, file);
    }
  }

  private queuePreview(localId: number, file: File): void {
    this.previews = this.previews.then(async () => {
      let previewUrl: string;

      try {
        previewUrl = await this.previewMaker(file);
      } catch {
        // A browser that cannot shrink the photo still shows it, just more slowly.
        previewUrl = URL.createObjectURL(file);
      }

      this.previewReady.emit({ localId, previewUrl });
    });
  }

  private async process(id: number, file: File): Promise<void> {
    try {
      const prepared = await preparePhoto(file, this.codec);
      this.patch(id, { status: 'uploading', warnings: prepared.warnings });

      const result = await this.uploads.upload(prepared.blob);
      this.patch(id, { result, status: 'done' });
      this.finished.emit({ localId: id, result });
    } catch (error) {
      const reason =
        error instanceof PhotoRejectedError || error instanceof PhotoUploadError
          ? ERROR_KEYS[error.reason]
          : ERROR_KEYS['upload-failed'];
      this.patch(id, { errorKey: reason, status: 'failed' });
      this.finished.emit({ localId: id, result: null });
    }
  }

  private patch(id: number, changes: Partial<UploadItem>): void {
    this.items.update((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }
}
