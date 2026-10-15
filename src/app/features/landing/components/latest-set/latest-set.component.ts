import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { formatSetCounter } from '@features/photo-posts/utils/set-counter';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

/** Fraction of the visible width moved per arrow press. */
const SCROLL_STEP = 0.8;
/** Sub-pixel slack when deciding the strip reached an edge. */
const EDGE_TOLERANCE = 2;
/** Pixels the mouse must travel before a press counts as a drag, so a plain click still opens the photo. */
const DRAG_THRESHOLD = 5;

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
    PluralKeyPipe,
    PostPhotoComponent,
    RouterLink,
    ScrollRevealDirective,
    TranslocoDirective,
  ],
  selector: 'app-latest-set',
  styleUrl: './latest-set.component.css',
  templateUrl: './latest-set.component.html',
  host: { '[class.latest-set--loading]': '!ready()' },
})
export class LatestSetComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly languageStore = inject(LanguageStore);
  private readonly photoPostsStore = inject(PhotoPostsStore);

  protected readonly counter = formatSetCounter;
  protected readonly lang = this.languageStore.currentLang;
  protected readonly post = this.photoPostsStore.latestPost;
  protected readonly ready = this.photoPostsStore.ready;

  protected readonly atEnd = signal(false);
  protected readonly atStart = signal(true);
  protected readonly dragging = signal(false);

  private dragOrigin = { left: 0, x: 0 };
  private moved = false;
  private pressed = false;

  /** Index of the photo being pressed, the only one that gets the name its transition to the viewer needs. */
  protected readonly pressedIndex = signal<number | null>(null);

  constructor() {
    // A drag must not end as a click on the photo under the pointer. The click is stopped in the capture
    // phase, before it reaches the link.
    afterNextRender(() =>
      this.host.nativeElement.addEventListener(
        'click',
        (event) => {
          if (!this.moved) return;

          event.preventDefault();
          event.stopPropagation();
          this.moved = false;
        },
        true
      )
    );
  }

  /** Lets a mouse drag the strip like a finger does; touch already scrolls natively. */
  protected dragStart(event: PointerEvent, strip: HTMLElement): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    this.dragOrigin = { left: strip.scrollLeft, x: event.clientX };
    this.moved = false;
    this.pressed = true;
  }

  protected dragMove(event: PointerEvent, strip: HTMLElement): void {
    if (!this.pressed) return;

    const distance = event.clientX - this.dragOrigin.x;

    if (!this.dragging()) {
      if (Math.abs(distance) < DRAG_THRESHOLD) return;

      this.dragging.set(true);
      this.moved = true;
      strip.setPointerCapture?.(event.pointerId);
    }

    strip.scrollLeft = this.dragOrigin.left - distance;
  }

  protected dragEnd(): void {
    this.pressed = false;
    this.dragging.set(false);
  }

  /** Remembers which photo is about to open, so only that one carries the view transition name. */
  protected press(index: number): void {
    this.pressedIndex.set(index);
  }

  protected scrollBy(strip: HTMLElement, direction: -1 | 1): void {
    strip.scrollBy({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      left: direction * strip.clientWidth * SCROLL_STEP,
    });
  }

  protected updateEdges(strip: HTMLElement): void {
    this.atStart.set(strip.scrollLeft <= EDGE_TOLERANCE);
    this.atEnd.set(strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - EDGE_TOLERANCE);
  }
}
