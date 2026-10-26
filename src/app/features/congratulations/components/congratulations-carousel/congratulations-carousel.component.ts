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

/** Shortest time a message stays, in seconds. */
const MIN_SECONDS = 7;
/** Characters read in a second, so a long message stays long enough to be read. */
const READ_CHARS_PER_SECOND = 18;
/** Time each photo of a message stays, in seconds. */
const PHOTO_SECONDS = 5;

/** How long a message stays: enough to read its words and to see each of its photos once. */
const slideSeconds = (message: string, photos: number): number =>
  Math.max(MIN_SECONDS, Math.ceil(message.length / READ_CHARS_PER_SECOND), photos * PHOTO_SECONDS);

/** `index` brought inside `0..total - 1`, going round at both ends. */
const wrap = (index: number, total: number): number => ((index % total) + total) % total;

/**
 * The friends' messages one at a time: the photos or video on one side, the words on the other. It passes
 * on its own when the progress bar of the current message fills up (a CSS animation, so it also stops
 * when the visitor asks the system for less motion), holds while a video plays, a photo is open full
 * screen to zoom in or the pointer rests on the photos, and can be paused. The photos of a message pass
 * the same way, each with its own bar, and have their own arrows.
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
  private readonly texts = viewChild.required<ElementRef<HTMLElement>>('texts');
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  readonly items = input.required<readonly Congratulation[]>();

  protected readonly counter = formatSetCounter;
  protected readonly photoSeconds = PHOTO_SECONDS;
  /** A mouse rests on the photos, or the keyboard is on their arrows. */
  protected readonly hovering = signal(false);
  protected readonly index = signal(0);
  protected readonly paused = signal(false);
  /** The photo shown of each message, by its index; a message comes back to its first photo. */
  private readonly photoIndexes = signal<readonly number[]>([]);
  /** Index of the message whose video is playing, if any. */
  protected readonly playing = signal<number | null>(null);

  /** The photo open full screen, with the name of who sent it. */
  protected readonly viewing = signal<{ from: string; photo: Photo } | null>(null);

  protected readonly slides = computed(() =>
    this.items().map((item) => {
      const photos = item.media?.kind === 'photo' ? item.media.photos : [];
      return {
        ...item,
        duration: slideSeconds(item.message, photos.length),
        media: slideMedia(item.media),
        photos,
      };
    })
  );
  protected readonly total = computed(() => this.items().length);
  /** Index shown, kept inside the list when it gets shorter. */
  protected readonly current = computed(() =>
    Math.min(this.index(), Math.max(this.total() - 1, 0))
  );
  /** The photos of the message shown; empty for a video or words alone. */
  protected readonly currentPhotos = computed(() => this.slides()[this.current()]?.photos ?? []);
  /** The description of the photo shown, written under it; empty for a video or words alone. */
  protected readonly caption = computed(
    () => this.currentPhotos()[this.shownPhoto(this.current())]?.alt ?? ''
  );
  /**
   * The automatic pass waits while it is paused, a video plays, a photo is open full screen or the
   * pointer rests on the photos.
   */
  protected readonly halted = computed(
    () => this.paused() || this.playing() !== null || this.viewing() !== null || this.hovering()
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
    const target = wrap(index, this.total());
    this.index.set(target);
    // A long message scrolls inside its column; the next one starts from its first line.
    this.texts().nativeElement.scrollTop = 0;
    this.playing.set(null);
    this.photoIndexes.update((indexes) => {
      const next = [...indexes];
      next[target] = 0;
      return next;
    });
  }

  /** Index of the photo shown in a message, kept inside its list. */
  protected shownPhoto(slide: number): number {
    const count = this.slides()[slide]?.photos.length ?? 0;
    return Math.min(this.photoIndexes()[slide] ?? 0, Math.max(count - 1, 0));
  }

  protected nextPhoto(): void {
    this.goToPhoto(this.shownPhoto(this.current()) + 1);
  }

  protected previousPhoto(): void {
    this.goToPhoto(this.shownPhoto(this.current()) - 1);
  }

  /**
   * Only a mouse rests on the photos. A tap on a touch screen fires no leave until the next tap elsewhere,
   * so counting it would leave the automatic pass held.
   */
  protected onMediaPointer(event: PointerEvent, entering: boolean): void {
    if (event.pointerType === 'mouse') this.hovering.set(entering);
  }

  /** The keyboard on the arrows holds the pass; a tap that focuses them does not. */
  protected onMediaFocusIn(event: FocusEvent): void {
    if ((event.target as HTMLElement).matches(':focus-visible')) this.hovering.set(true);
  }

  /** Focus leaving for an element still inside the photos does not count as leaving them. */
  protected onMediaFocusOut(event: FocusEvent): void {
    const area = event.currentTarget as HTMLElement;
    if (!area.contains(event.relatedTarget as Node | null)) this.hovering.set(false);
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

  private goToPhoto(index: number): void {
    const count = this.currentPhotos().length;
    if (count === 0) return;

    const slide = this.current();
    const target = wrap(index, count);
    this.photoIndexes.update((indexes) => {
      const next = [...indexes];
      next[slide] = target;
      return next;
    });
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
