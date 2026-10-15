import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

  /** Lets a mouse drag the strip like a finger does; touch already scrolls natively. */
  protected dragStart(event: PointerEvent, strip: HTMLElement): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    this.dragOrigin = { left: strip.scrollLeft, x: event.clientX };
    this.dragging.set(true);
    strip.setPointerCapture?.(event.pointerId);
  }

  protected dragMove(event: PointerEvent, strip: HTMLElement): void {
    if (!this.dragging()) return;

    strip.scrollLeft = this.dragOrigin.left - (event.clientX - this.dragOrigin.x);
  }

  protected dragEnd(): void {
    this.dragging.set(false);
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
