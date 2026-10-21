import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { Photo } from '@features/photo-posts/models/photo.model';
import { formatSetCounter } from '@features/photo-posts/utils/set-counter';
import { ZoomablePhotoComponent } from '@features/post-viewer/components/zoomable-photo/zoomable-photo.component';

import { Congratulation } from '../../models/congratulation.model';
import { slideMedia } from '../../utils/slide-media';
import { VideoFacadeComponent } from '../video-facade/video-facade.component';

/**
 * The friends' messages one at a time: the photo or video on one side, the words on the other. It passes
 * on its own when the progress bar of the current message fills up (a CSS animation, so it also stops
 * when the visitor asks the system for less motion), holds while a video plays or a photo is open full
 * screen to zoom in, and can be paused.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, VideoFacadeComponent, ZoomablePhotoComponent],
  selector: 'app-congratulations-carousel',
  styleUrl: './congratulations-carousel.component.css',
  templateUrl: './congratulations-carousel.component.html',
})
export class CongratulationsCarouselComponent {
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  readonly items = input.required<readonly Congratulation[]>();

  protected readonly counter = formatSetCounter;
  protected readonly index = signal(0);
  protected readonly paused = signal(false);
  /** Index of the message whose video is playing, if any. */
  protected readonly playing = signal<number | null>(null);

  /** The photo open full screen, with the name of who sent it. */
  protected readonly viewing = signal<{ from: string; photo: Photo } | null>(null);

  protected readonly slides = computed(() =>
    this.items().map((item) => ({
      ...item,
      media: slideMedia(item.media),
      photo: item.media?.kind === 'photo' ? item.media.photo : null,
    }))
  );
  protected readonly total = computed(() => this.items().length);
  /** Index shown, kept inside the list when it gets shorter. */
  protected readonly current = computed(() =>
    Math.min(this.index(), Math.max(this.total() - 1, 0))
  );
  /** The description of the photo shown, written under it; empty for a video or words alone. */
  protected readonly caption = computed(() => this.slides()[this.current()]?.photo?.alt ?? '');
  /** The automatic pass waits while it is paused, a video plays or a photo is open full screen. */
  protected readonly halted = computed(
    () => this.paused() || this.playing() !== null || this.viewing() !== null
  );
  /** With less motion asked for, the progress bar does not animate, so nothing passes on its own. */
  private readonly reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /** The position is announced only while nothing moves on its own, so autoplay does not chatter. */
  protected readonly announced = computed(() => this.reducedMotion || this.halted());

  /** A video that reaches its end lets the automatic pass go on. */
  protected finished(index: number): void {
    if (this.playing() === index) this.playing.set(null);
  }

  protected closeViewer(): void {
    this.viewer().nativeElement.close();
  }

  protected enlarge(from: string, photo: Photo): void {
    this.viewing.set({ from, photo });
    this.viewer().nativeElement.showModal();
  }

  protected goTo(index: number): void {
    const total = this.total();
    this.index.set(((index % total) + total) % total);
    this.playing.set(null);
  }

  /** Without `closedby` support (Safari), a click on the backdrop still closes the dialog. */
  protected onViewerClick(event: MouseEvent): void {
    const dialog = this.viewer().nativeElement;
    if ('closedBy' in HTMLDialogElement.prototype || event.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const inside =
      rect.top <= event.clientY &&
      event.clientY <= rect.bottom &&
      rect.left <= event.clientX &&
      event.clientX <= rect.right;
    if (!inside) dialog.close();
  }

  /** The dialog closes with its button, Escape or a click outside the photo. */
  protected viewerClosed(): void {
    this.viewing.set(null);
  }

  protected next(): void {
    this.goTo(this.current() + 1);
  }

  protected play(index: number): void {
    this.playing.set(index);
  }

  protected previous(): void {
    this.goTo(this.current() - 1);
  }

  protected togglePause(): void {
    this.paused.update((paused) => !paused);
  }
}
