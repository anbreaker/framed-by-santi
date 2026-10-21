import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { formatSetCounter } from '@features/photo-posts/utils/set-counter';

import { Congratulation } from '../../models/congratulation.model';
import { slideMedia } from '../../utils/slide-media';
import { VideoFacadeComponent } from '../video-facade/video-facade.component';

/**
 * The friends' messages one at a time: the photo or video on one side, the words on the other. It passes
 * on its own when the progress bar of the current message fills up (a CSS animation, so it also stops
 * when the visitor asks the system for less motion), holds while a video plays and can be paused.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, VideoFacadeComponent],
  selector: 'app-congratulations-carousel',
  styleUrl: './congratulations-carousel.component.css',
  templateUrl: './congratulations-carousel.component.html',
})
export class CongratulationsCarouselComponent {
  readonly items = input.required<readonly Congratulation[]>();

  protected readonly counter = formatSetCounter;
  protected readonly index = signal(0);
  protected readonly paused = signal(false);
  /** Index of the message whose video is playing, if any. */
  protected readonly playing = signal<number | null>(null);

  protected readonly slides = computed(() =>
    this.items().map((item) => ({ ...item, media: slideMedia(item.media) }))
  );
  protected readonly total = computed(() => this.items().length);
  /** Index shown, kept inside the list when it gets shorter. */
  protected readonly current = computed(() =>
    Math.min(this.index(), Math.max(this.total() - 1, 0))
  );
  /** The automatic pass waits while it is paused or a video plays. */
  protected readonly halted = computed(() => this.paused() || this.playing() !== null);

  protected goTo(index: number): void {
    const total = this.total();
    this.index.set(((index % total) + total) % total);
    this.playing.set(null);
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
