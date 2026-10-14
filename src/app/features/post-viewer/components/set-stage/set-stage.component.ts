import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';

import { swipeDirection } from '../../utils/swipe-direction';

/** The big photo of a set, with arrows and swipe. It only reports intent; the page owns the state. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, TranslocoDirective],
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

  /** A list of one lets `@for` remount the photo, which replays its fade-in on every change. */
  protected readonly shownPhotos = computed(() => [this.photo()]);

  private swipeStartX: number | null = null;

  protected onPointerCancel(): void {
    this.swipeStartX = null;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.swipeStartX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.swipeStartX === null) return;

    const direction = swipeDirection(this.swipeStartX, event.clientX);
    this.swipeStartX = null;

    if (direction === 'next' && !this.isLast()) this.next.emit();
    if (direction === 'previous' && !this.isFirst()) this.previous.emit();
  }
}
