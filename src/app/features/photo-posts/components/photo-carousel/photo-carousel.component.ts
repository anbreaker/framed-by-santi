import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { formatSetCounter } from '@features/photo-posts/utils/set-counter';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { DragScrollDirective } from '@shared/directives/drag-scroll.directive';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

/** Fraction of the visible width moved per arrow press. */
const SCROLL_STEP = 0.8;
/** Sub-pixel slack when deciding the strip reached an edge. */
const EDGE_TOLERANCE = 2;

/**
 * Every photo of a set in one strip: draggable with the mouse, with arrows, a counter on each photo and a
 * link to the viewer opened on the photo clicked. What the page puts inside goes next to the arrows. The
 * height of the photos comes from `--carousel-height`, so each page decides how tall its strip is.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragScrollDirective,
    LocalizedTextPipe,
    PostPhotoComponent,
    RouterLink,
    ScrollRevealDirective,
    TranslocoDirective,
  ],
  selector: 'app-photo-carousel',
  styleUrl: './photo-carousel.component.css',
  templateUrl: './photo-carousel.component.html',
})
export class PhotoCarouselComponent {
  private readonly languageStore = inject(LanguageStore);

  /** Name of the strip for assistive technology. */
  readonly label = input.required<string>();
  readonly post = input.required<PhotoPost>();

  protected readonly atEnd = signal(false);
  protected readonly atStart = signal(true);
  protected readonly counter = formatSetCounter;
  protected readonly lang = this.languageStore.currentLang;
  /** Index of the photo being pressed, the only one that gets the name its transition to the viewer needs. */
  protected readonly pressedIndex = signal<number | null>(null);

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
