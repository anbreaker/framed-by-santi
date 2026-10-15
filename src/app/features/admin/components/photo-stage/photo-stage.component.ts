import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';

/** A photo in the editor: uploaded (plain), or still local while it uploads or after it failed. */
export interface StagePhoto extends Photo {
  /** Links the photo to its file in the upload panel until it is uploaded. */
  localId?: number;
  /** Object URL of the local file, shown until the uploaded photo replaces it. */
  previewUrl?: string;
  state?: 'failed' | 'uploading';
}

export interface PhotoMove {
  from: number;
  to: number;
}

export interface AltChange {
  alt: string;
  index: number;
}

/**
 * Shows the photos of a set one at a time at their real ratio, with arrows and a thumbnail strip.
 * It only reports what the author asks for; the editor owns the list and applies the changes.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, TranslocoDirective],
  selector: 'app-photo-stage',
  styleUrl: './photo-stage.component.css',
  templateUrl: './photo-stage.component.html',
})
export class PhotoStageComponent {
  readonly photos = input.required<readonly StagePhoto[]>();

  readonly addRequested = output<void>();
  readonly altChanged = output<AltChange>();
  readonly coverChosen = output<number>();
  /** Files dropped on the empty viewer, so the editor can upload them. */
  readonly filesDropped = output<File[]>();
  readonly moved = output<PhotoMove>();
  readonly removed = output<number>();

  private readonly dragFrom = signal<number | null>(null);
  protected readonly receiving = signal(false);
  private readonly requested = signal(0);

  protected readonly count = computed(() => this.photos().length);
  /** The wanted position, kept inside the list when photos are removed. */
  protected readonly index = computed(() =>
    Math.max(0, Math.min(this.requested(), this.photos().length - 1))
  );
  protected readonly current = computed(() => this.photos()[this.index()]);

  protected go(position: number): void {
    if (position >= 0 && position < this.count()) this.requested.set(position);
  }

  protected move(to: number): void {
    const from = this.index();

    if (to < 0 || to >= this.count() || to === from) return;

    this.moved.emit({ from, to });
    this.requested.set(to);
  }

  protected makeCover(): void {
    this.coverChosen.emit(this.index());
    this.requested.set(0);
  }

  protected remove(): void {
    this.removed.emit(this.index());
  }

  protected setAlt(event: Event): void {
    this.altChanged.emit({ alt: (event.target as HTMLInputElement).value, index: this.index() });
  }

  protected acceptFiles(event: DragEvent): void {
    event.preventDefault();
    this.receiving.set(true);
  }

  protected dropFiles(event: DragEvent): void {
    event.preventDefault();
    this.receiving.set(false);

    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) this.filesDropped.emit(files);
  }

  protected startDrag(position: number): void {
    this.dragFrom.set(position);
  }

  protected drop(to: number): void {
    const from = this.dragFrom();
    this.dragFrom.set(null);

    if (from === null || from === to) return;

    this.moved.emit({ from, to });
    this.requested.set(to);
  }
}
