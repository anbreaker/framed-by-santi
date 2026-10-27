import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
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
  CongratulationMedia,
  MAX_FROM_LENGTH,
  MAX_MESSAGE_LENGTH,
  photoMedia,
} from '../../models/congratulation.model';
import { cloudinaryVideoPoster } from '../../utils/cloudinary-video';
import { youtubePoster, youtubeVideoId } from '../../utils/youtube';

/**
 * One photo or video of the message, in the order they are shown: a new photo or video file to upload,
 * or media ready to save as it is (a saved item or a YouTube link).
 */
export type MediaEntry =
  | { alt: string; file: File; kind: 'photo'; whole: boolean }
  | { file: File; kind: 'video' }
  | { kind: 'ready'; media: CongratulationMedia };

/** What the form hands over; the page uploads the new files, if any, and saves. */
export interface CongratulationFormValue {
  from: string;
  /** The photos and videos, in order; empty for words alone. */
  media: readonly MediaEntry[];
  message: string;
}

type FormError = 'from' | 'message';
type RowError = 'videoTooLarge' | 'youtube';

/** Cloudinary takes videos up to this size in a single upload on the plan the site uses. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** Width of the small preview of a saved photo in the list. */
const PREVIEW_WIDTH = 160;

/**
 * A row of the list, with a key that keeps it while the list is put in order. New files carry an object
 * URL of the file as their preview; saved items a small image from Cloudinary.
 */
type MediaRow = { key: number } & (
  | { alt: string; file: File; kind: 'photo'; preview: string | null; whole: boolean }
  | { file: File; kind: 'video'; preview: string | null }
  | { kind: 'youtube'; link: string }
  | { alt: string; kind: 'saved-photo'; photo: Photo; preview: string; whole: boolean }
  | { kind: 'saved-video'; preview: string | null; publicId: string }
);

/**
 * Writes or edits one message: who sends it, the words and any number of photos, YouTube videos and
 * Cloudinary videos, mixed in the order they should be shown. It checks what the security rules will
 * check, so a refusal never comes as a surprise.
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
  private readonly injector = inject(Injector);

  /** The message being edited, or null to write a new one. */
  readonly editing = input<Congratulation | null>(null);
  /** Changing it empties the form, for example after a save. */
  readonly resetKey = input(0);
  readonly saving = input(false);

  readonly cancelled = output<void>();
  readonly submitted = output<CongratulationFormValue>();

  protected readonly maxFrom = MAX_FROM_LENGTH;
  protected readonly maxMessage = MAX_MESSAGE_LENGTH;

  private readonly source = computed(() => ({ item: this.editing(), key: this.resetKey() }));

  protected readonly from = linkedSignal(() => this.source().item?.from ?? '');
  protected readonly message = linkedSignal(() => this.source().item?.message ?? '');
  private rowKey = 0;
  /** Object URLs of the new files' previews, freed when their rows go. */
  private readonly objectUrls = new Set<string>();
  protected readonly rows = linkedSignal(() => this.savedRows(this.source().item));
  protected readonly errors = linkedSignal<{ key: unknown }, readonly FormError[]>({
    computation: () => [],
    source: () => ({ key: this.source() }),
  });
  /** The problem of each row that has one, by its key. */
  protected readonly rowErrors = linkedSignal<{ key: unknown }, ReadonlyMap<number, RowError>>({
    computation: () => new Map(),
    source: () => ({ key: this.source() }),
  });

  protected readonly isEditing = computed(() => this.editing() !== null);
  /** A fresh object on every reset, so the file pickers are drawn again with nothing chosen. */
  protected readonly fileInputs = computed(() => [this.source()]);

  constructor() {
    // The list starts again on every reset or edit, so the previews of the files chosen before go.
    effect(() => {
      this.source();
      untracked(() => this.freePreviews());
    });
    inject(DestroyRef).onDestroy(() => this.freePreviews());
  }

  protected hasError(error: FormError): boolean {
    return this.errors().includes(error);
  }

  protected rowError(row: MediaRow): RowError | null {
    return this.rowErrors().get(row.key) ?? null;
  }

  /** The YouTube thumbnail of a link, once it is a valid one. */
  protected youtubeThumbnail(link: string): string | null {
    const id = youtubeVideoId(link);
    return id === null ? null : youtubePoster(id);
  }

  protected onText(target: 'from' | 'message', event: Event): void {
    this[target].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected onAlt(index: number, event: Event): void {
    const alt = (event.target as HTMLInputElement).value;
    this.updateRow(index, (row) => ('alt' in row ? { ...row, alt } : row));
  }

  /** Marks a photo to show whole, over a blurred copy of itself, instead of cropped to the frame. */
  protected onWhole(index: number, event: Event): void {
    const whole = (event.target as HTMLInputElement).checked;
    this.updateRow(index, (row) => ('whole' in row ? { ...row, whole } : row));
  }

  protected onLink(index: number, event: Event): void {
    const link = (event.target as HTMLInputElement).value;
    this.updateRow(index, (row) => (row.kind === 'youtube' ? { ...row, link } : row));
  }

  /** Every photo chosen goes after the items already in the list, each with a preview of the file. */
  protected onPhotos(event: Event): void {
    this.addFiles(event, (file) => ({
      alt: '',
      file,
      key: this.rowKey++,
      kind: 'photo',
      preview: this.previewOf(file),
      whole: false,
    }));
  }

  /** Every video chosen goes after the items already in the list, each with a preview of the file. */
  protected onVideos(event: Event): void {
    this.addFiles(event, (file) => ({
      file,
      key: this.rowKey++,
      kind: 'video',
      preview: this.previewOf(file),
    }));
  }

  /** A new empty YouTube link at the end of the list, focused to paste into. */
  protected addYoutube(): void {
    const index = this.rows().length;
    this.rows.update((rows) => [...rows, { key: this.rowKey++, kind: 'youtube', link: '' }]);
    afterNextRender(() => document.getElementById(`congrats-youtube-${index}`)?.focus(), {
      injector: this.injector,
    });
  }

  protected move(index: number, step: -1 | 1): void {
    this.rows.update((rows) => {
      const target = index + step;
      if (target < 0 || target >= rows.length) return rows;

      const moved = [...rows];
      [moved[index], moved[target]] = [moved[target], moved[index]];
      return moved;
    });
  }

  protected remove(index: number): void {
    const row = this.rows()[index];
    const preview = row && 'preview' in row ? row.preview : null;
    if (preview && this.objectUrls.delete(preview)) URL.revokeObjectURL(preview);
    this.rows.update((rows) => rows.filter((_row, i) => i !== index));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    const errors = this.validate();
    const rowErrors = this.validateRows();
    this.errors.set(errors);
    this.rowErrors.set(rowErrors);
    if (errors.length > 0 || rowErrors.size > 0) return;

    this.submitted.emit({
      from: this.from().trim(),
      media: this.rows().map((row) => this.entryOf(row)),
      message: this.message().trim(),
    });
  }

  private addFiles(event: Event, toRow: (file: File) => MediaRow): void {
    const input = event.target as HTMLInputElement;
    const added = Array.from(input.files ?? []).map(toRow);
    this.rows.update((rows) => [...rows, ...added]);
    // Empty the picker, so the same file can be chosen again after taking it out.
    input.value = '';
  }

  private updateRow(index: number, change: (row: MediaRow) => MediaRow): void {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? change(row) : row)));
  }

  /** What a row hands over; a YouTube link is already checked to hold a video id. */
  private entryOf(row: MediaRow): MediaEntry {
    switch (row.kind) {
      case 'photo':
        return { alt: row.alt.trim(), file: row.file, kind: 'photo', whole: row.whole };
      case 'video':
        return { file: row.file, kind: 'video' };
      case 'youtube':
        return { kind: 'ready', media: { kind: 'youtube', video: youtubeVideoId(row.link) ?? '' } };
      case 'saved-photo':
        return {
          kind: 'ready',
          media: photoMedia({ ...row.photo, alt: row.alt.trim() }, row.whole),
        };
      case 'saved-video':
        return { kind: 'ready', media: { kind: 'cloudinary', publicId: row.publicId } };
    }
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

  private savedRows(item: Congratulation | null): MediaRow[] {
    return (item?.media ?? []).map((media): MediaRow => {
      const key = this.rowKey++;
      switch (media.kind) {
        case 'photo':
          return {
            alt: media.photo.alt,
            key,
            kind: 'saved-photo',
            photo: media.photo,
            preview: photoUrl(media.photo, PREVIEW_WIDTH),
            whole: media.whole === true,
          };
        case 'youtube':
          return { key, kind: 'youtube', link: `https://youtu.be/${media.video}` };
        case 'cloudinary':
          return {
            key,
            kind: 'saved-video',
            preview: cloudinaryVideoPoster(media.publicId),
            publicId: media.publicId,
          };
      }
    });
  }

  private validate(): FormError[] {
    const errors: FormError[] = [];
    const from = this.from().trim();
    const message = this.message().trim();

    if (from === '' || from.length > MAX_FROM_LENGTH) errors.push('from');
    if (message === '' || message.length > MAX_MESSAGE_LENGTH) errors.push('message');
    return errors;
  }

  private validateRows(): Map<number, RowError> {
    const errors = new Map<number, RowError>();
    for (const row of this.rows()) {
      if (row.kind === 'youtube' && youtubeVideoId(row.link) === null) {
        errors.set(row.key, 'youtube');
      }
      if (row.kind === 'video' && row.file.size > MAX_VIDEO_BYTES) {
        errors.set(row.key, 'videoTooLarge');
      }
    }
    return errors;
  }
}
