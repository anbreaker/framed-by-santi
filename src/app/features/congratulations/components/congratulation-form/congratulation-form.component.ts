import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  Congratulation,
  MAX_FROM_LENGTH,
  MAX_MESSAGE_LENGTH,
} from '../../models/congratulation.model';
import { youtubeVideoId } from '../../utils/youtube';

export type MediaKind = 'cloudinary' | 'none' | 'photo' | 'youtube';

/** What the form hands over; the page uploads the file, if any, and saves. */
export interface CongratulationFormValue {
  /** Description of the photo for screen readers. */
  alt: string;
  /** A new photo or video to upload; null keeps the one already saved. */
  file: File | null;
  from: string;
  kind: MediaKind;
  message: string;
  /** The YouTube video id, already read from the link. */
  youtube: string;
}

type FormError = 'from' | 'message' | 'photo' | 'video' | 'videoTooLarge' | 'youtube';

/** Cloudinary takes videos up to this size in a single upload on the plan the site uses. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const KINDS: readonly MediaKind[] = ['none', 'photo', 'youtube', 'cloudinary'];

const youtubeLink = (item: Congratulation | null): string =>
  item?.media?.kind === 'youtube' ? `https://youtu.be/${item.media.video}` : '';

/**
 * Writes or edits one message: who sends it, the words and an optional photo, YouTube video or Cloudinary
 * video. It checks what the security rules will check, so a refusal never comes as a surprise.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-congratulation-form',
  styleUrl: './congratulation-form.component.css',
  templateUrl: './congratulation-form.component.html',
})
export class CongratulationFormComponent {
  /** The message being edited, or null to write a new one. */
  readonly editing = input<Congratulation | null>(null);
  /** Changing it empties the form, for example after a save. */
  readonly resetKey = input(0);
  readonly saving = input(false);

  readonly cancelled = output<void>();
  readonly submitted = output<CongratulationFormValue>();

  protected readonly kinds = KINDS;
  protected readonly maxFrom = MAX_FROM_LENGTH;
  protected readonly maxMessage = MAX_MESSAGE_LENGTH;

  private readonly source = computed(() => ({ item: this.editing(), key: this.resetKey() }));

  protected readonly from = linkedSignal(() => this.source().item?.from ?? '');
  protected readonly message = linkedSignal(() => this.source().item?.message ?? '');
  protected readonly kind = linkedSignal<MediaKind>(
    () => this.source().item?.media?.kind ?? 'none'
  );
  protected readonly alt = linkedSignal(() => {
    const media = this.source().item?.media;
    return media?.kind === 'photo' ? media.photo.alt : '';
  });
  protected readonly youtube = linkedSignal(() => youtubeLink(this.source().item));
  protected readonly file = linkedSignal<{ key: unknown }, File | null>({
    computation: () => null,
    source: () => ({ key: this.source() }),
  });
  protected readonly errors = linkedSignal<{ key: unknown }, readonly FormError[]>({
    computation: () => [],
    source: () => ({ key: this.source() }),
  });

  /** The saved media of this kind is kept unless a new file replaces it. */
  protected readonly keepsSaved = computed(
    () => this.file() === null && this.editing()?.media?.kind === this.kind()
  );
  protected readonly isEditing = computed(() => this.editing() !== null);
  /** A fresh object on every reset, so the file pickers are drawn again with nothing chosen. */
  protected readonly fileInputs = computed(() => [this.source()]);

  protected hasError(error: FormError): boolean {
    return this.errors().includes(error);
  }

  protected onText(target: 'alt' | 'from' | 'message' | 'youtube', event: Event): void {
    this[target].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected onKind(kind: MediaKind): void {
    this.kind.set(kind);
    this.file.set(null);
  }

  protected onFile(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.item(0) ?? null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    const errors = this.validate();
    this.errors.set(errors);
    if (errors.length > 0) return;

    this.submitted.emit({
      alt: this.alt().trim(),
      file: this.kind() === 'photo' || this.kind() === 'cloudinary' ? this.file() : null,
      from: this.from().trim(),
      kind: this.kind(),
      message: this.message().trim(),
      youtube: this.kind() === 'youtube' ? (youtubeVideoId(this.youtube()) ?? '') : '',
    });
  }

  private validate(): FormError[] {
    const errors: FormError[] = [];
    const from = this.from().trim();
    const message = this.message().trim();
    const file = this.file();

    if (from === '' || from.length > MAX_FROM_LENGTH) errors.push('from');
    if (message === '' || message.length > MAX_MESSAGE_LENGTH) errors.push('message');

    switch (this.kind()) {
      case 'photo':
        if (file === null && !this.keepsSaved()) errors.push('photo');
        break;
      case 'youtube':
        if (youtubeVideoId(this.youtube()) === null) errors.push('youtube');
        break;
      case 'cloudinary':
        if (file === null && !this.keepsSaved()) errors.push('video');
        else if (file !== null && file.size > MAX_VIDEO_BYTES) errors.push('videoTooLarge');
        break;
    }

    return errors;
  }
}
