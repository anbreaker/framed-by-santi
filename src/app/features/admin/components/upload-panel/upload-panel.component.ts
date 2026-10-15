import {
  ChangeDetectionStrategy,
  Component,
  inject,
  InjectionToken,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  PhotoUploadError,
  PhotoUploadService,
  UploadedPhoto,
} from '../../services/photo-upload.service';
import { browserImageCodec } from '../../utils/browser-image-codec';
import {
  ImageCodec,
  MAX_LONG_EDGE,
  PhotoRejectedError,
  PhotoWarning,
  preparePhoto,
} from '../../utils/prepare-photo';

export const IMAGE_CODEC = new InjectionToken<ImageCodec>('IMAGE_CODEC', {
  factory: (): ImageCodec => browserImageCodec,
});

type UploadStatus = 'done' | 'failed' | 'preparing' | 'uploading';

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
  private readonly uploads = inject(PhotoUploadService);

  private nextId = 0;

  /** Emits each photo as soon as it is on Cloudinary, so a post can collect them. */
  readonly uploaded = output<UploadedPhoto>();

  protected readonly items = signal<readonly UploadItem[]>([]);
  protected readonly maxLongEdge = MAX_LONG_EDGE;

  protected async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    input.value = '';

    const added = files.map<UploadItem>((file) => ({
      errorKey: null,
      id: this.nextId++,
      name: file.name,
      result: null,
      status: 'preparing',
      warnings: [],
    }));
    this.items.update((current) => [...current, ...added]);

    // One photo at a time keeps memory and bandwidth predictable on a phone.
    for (const [index, file] of files.entries()) {
      await this.process(added[index].id, file);
    }
  }

  private async process(id: number, file: File): Promise<void> {
    try {
      const prepared = await preparePhoto(file, this.codec);
      this.patch(id, { status: 'uploading', warnings: prepared.warnings });

      const result = await this.uploads.upload(prepared.blob);
      this.patch(id, { result, status: 'done' });
      this.uploaded.emit(result);
    } catch (error) {
      const reason =
        error instanceof PhotoRejectedError || error instanceof PhotoUploadError
          ? ERROR_KEYS[error.reason]
          : ERROR_KEYS['upload-failed'];
      this.patch(id, { errorKey: reason, status: 'failed' });
    }
  }

  private patch(id: number, changes: Partial<UploadItem>): void {
    this.items.update((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  }
}
