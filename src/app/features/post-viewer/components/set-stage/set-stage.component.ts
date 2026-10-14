import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { Photo } from '@features/photo-posts/models/photo.model';

import { swipeDirection } from '../../utils/swipe-direction';
import { ZoomablePhotoComponent } from '../zoomable-photo/zoomable-photo.component';

/** The big photo of a set, with arrows and swipe. It only reports intent; the page owns the state. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ZoomablePhotoComponent],
  selector: 'app-set-stage',
  styleUrl: './set-stage.component.css',
  templateUrl: './set-stage.component.html',
})
export class SetStageComponent {
  readonly isFirst = input(false);
  readonly isLast = input(false);
  readonly photo = input.required<Photo>();
  /** Shared with the gallery tile so the cover morphs into this photo. */
  readonly transitionName = input<string | null>(null);

  readonly next = output<void>();
  readonly previous = output<void>();
  /** Whether the photo is zoomed in; while it is, dragging moves the photo instead of swiping. */
  readonly zoomedChange = output<boolean>();

  protected readonly isZoomed = signal(false);
  /** A list of one lets `@for` remount the photo, which replays its fade-in and resets its zoom. */
  protected readonly shownPhotos = computed(() => [this.photo()]);

  private activePointers = 0;
  private swipeStartX: number | null = null;

  constructor() {
    effect(() => this.zoomedChange.emit(this.isZoomed()));
  }

  protected onPointerCancel(): void {
    this.activePointers = Math.max(0, this.activePointers - 1);
    this.swipeStartX = null;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.activePointers++;

    // A second finger means pinch, never swipe.
    const isSwipeCandidate = event.pointerType !== 'mouse' && this.activePointers === 1;
    this.swipeStartX = isSwipeCandidate ? event.clientX : null;
  }

  protected onPointerUp(event: PointerEvent): void {
    this.activePointers = Math.max(0, this.activePointers - 1);

    if (this.swipeStartX === null || this.isZoomed()) {
      this.swipeStartX = null;
      return;
    }

    const direction = swipeDirection(this.swipeStartX, event.clientX);
    this.swipeStartX = null;

    if (direction === 'next' && !this.isLast()) this.next.emit();
    if (direction === 'previous' && !this.isFirst()) this.previous.emit();
  }
}
