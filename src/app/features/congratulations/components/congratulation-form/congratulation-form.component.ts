import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { Photo } from '@features/photo-posts/models/photo.model';
import { photoUrl } from '@features/photo-posts/utils/photo-url';

import {
  Congratulation,
  MAX_FROM_LENGTH,
  MAX_MESSAGE_LENGTH,
} from '../../models/congratulation.model';
import { youtubeVideoId } from '../../utils/youtube';

export type MediaKind = 'cloudinary' | 'none' | 'photo' | 'youtube';

/**
 * One photo of the message, in the order they are shown, with its description: a file to upload or a
 * photo already saved.
 */
export type PhotoEntry =
  { alt: string; file: File; kind: 'new' } | { alt: string; kind: 'saved'; photo: Photo };

/** What the form hands over; the page uploads the new files, if any, and saves. */
export interface CongratulationFormValue {
  /** A new video to upload; null keeps the one already saved. */
  file: File | null;
  from: string;
  kind: MediaKind;
  message: string;
  /** The photos, empty unless the kind is `photo`. */
  photos: readonly PhotoEntry[];
  /** The YouTube video id, already read from the link. */
  youtube: string;
}

type FormError = 'from' | 'message' | 'photo' | 'video' | 'videoTooLarge' | 'youtube';

/** Cloudinary takes videos up to this size in a single upload on the plan the site uses. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const KINDS: readonly MediaKind[] = ['none', 'photo', 'youtube', 'cloudinary'];

/** Width of the small preview of a saved photo in the list. */
const PREVIEW_WIDTH = 160;

/** A photo of the list, with a key that keeps its row while the list is put in order. */
interface PhotoRow {
  entry: PhotoEntry;
  key: number;
  /** A small preview: from Cloudinary for a saved photo, an object URL of the file for a new one. */
  preview: string | null;
}

const youtubeLink = (item: Congratulation | null): string =>
  item?.media?.kind === 'youtube' ? `https://youtu.be/${item.media.video}` : '';

/**
 * Writes or edits one message: who sends it, the words and optional photos, a YouTube video or a
 * Cloudinary video. It checks what the security rules will check, so a refusal never comes as a surprise.
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
  private rowKey = 0;
  /** Object URLs of the new files' previews, freed when their rows go. */
  private readonly objectUrls = new Set<string>();
  protected readonly photos = linkedSignal(() => this.savedRows(this.source().item));
  protected readonly youtube = linkedSignal(() => youtubeLink(this.source().item));
  protected readonly file = linkedSignal<{ key: unknown }, File | null>({
    computation: () => null,
    source: () => ({ key: this.source() }),
  });
  protected readonly errors = linkedSignal<{ key: unknown }, readonly FormError[]>({
    computation: () => [],
    source: () => ({ key: this.source() }),
  });

  /** The saved video is kept unless a new file replaces it. */
  protected readonly keepsSaved = computed(
    () => this.file() === null && this.editing()?.media?.kind === this.kind()
  );
  protected readonly isEditing = computed(() => this.editing() !== null);
  /** A fresh object on every reset, so the file pickers are drawn again with nothing chosen. */
  protected readonly fileInputs = computed(() => [this.source()]);

  protected hasError(error: FormError): boolean {
    return this.errors().includes(error);
  }

  protected onText(target: 'from' | 'message' | 'youtube', event: Event): void {
    this[target].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected onAlt(index: number, event: Event): void {
    const alt = (event.target as HTMLInputElement).value;
    this.photos.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, entry: { ...row.entry, alt } } : row))
    );
  }

  constructor() {
    // The list starts again on every reset or edit, so the previews of the files chosen before go.
    effect(() => {
      this.source();
      untracked(() => this.freePreviews());
    });
    inject(DestroyRef).onDestroy(() => this.freePreviews());
  }

  /** Every file chosen goes after the photos already in the list, each with a preview of the file. */
  protected onPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []).map((file): PhotoRow => ({
      entry: { alt: '', file, kind: 'new' },
      key: this.rowKey++,
      preview: this.previewOf(file),
    }));
    this.photos.update((rows) => [...rows, ...added]);
    // Empty the picker, so the same file can be chosen again after taking it out.
    input.value = '';
  }

  protected movePhoto(index: number, step: -1 | 1): void {
    this.photos.update((rows) => {
      const target = index + step;
      if (target < 0 || target >= rows.length) return rows;

      const moved = [...rows];
      [moved[index], moved[target]] = [moved[target], moved[index]];
      return moved;
    });
  }

  protected removePhoto(index: number): void {
    const preview = this.photos()[index]?.preview;
    if (preview && this.objectUrls.delete(preview)) URL.revokeObjectURL(preview);
    this.photos.update((rows) => rows.filter((_row, i) => i !== index));
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
      file: this.kind() === 'cloudinary' ? this.file() : null,
      from: this.from().trim(),
      kind: this.kind(),
      message: this.message().trim(),
      photos:
        this.kind() === 'photo'
          ? this.photos().map(({ entry }) => ({ ...entry, alt: entry.alt.trim() }))
          : [],
      youtube: this.kind() === 'youtube' ? (youtubeVideoId(this.youtube()) ?? '') : '',
    });
  }

  /** An object URL showing the file, or null where the browser cannot make one. */
  private previewOf(file: File): string | null {
    if (typeof URL.createObjectURL !== 'function') return null;

    const url = URL.createObjectURL(file);
    this.objectUrls.add(url);
    return url;
  }

  private freePreviews(): void {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }

  private savedRows(item: Congratulation | null): PhotoRow[] {
    if (item?.media?.kind !== 'photo') return [];

    return item.media.photos.map((photo) => ({
      entry: { alt: photo.alt, kind: 'saved', photo },
      key: this.rowKey++,
      preview: photoUrl(photo, PREVIEW_WIDTH),
    }));
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
        if (this.photos().length === 0) errors.push('photo');
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
