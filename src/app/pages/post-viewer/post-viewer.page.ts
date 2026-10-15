import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { formatSetCounter } from '@features/photo-posts/utils/set-counter';
import { SetStageComponent } from '@features/post-viewer/components/set-stage/set-stage.component';
import { SetThumbnailsComponent } from '@features/post-viewer/components/set-thumbnails/set-thumbnails.component';
import { stepIndex } from '@features/post-viewer/utils/step-index';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
    RouterLink,
    SetStageComponent,
    SetThumbnailsComponent,
    TranslocoDirective,
  ],
  selector: 'app-post-viewer-page',
  styleUrl: './post-viewer.page.css',
  templateUrl: './post-viewer.page.html',
  host: {
    '(window:keydown.arrowleft)': 'onArrowKey(-1)',
    '(window:keydown.arrowright)': 'onArrowKey(1)',
  },
})
export class PostViewerPageComponent {
  private readonly languageStore = inject(LanguageStore);
  private readonly photoPostsStore = inject(PhotoPostsStore);

  /** Bound from the `:postId` route parameter by the router. */
  readonly postId = input.required<string>();

  protected readonly activeIndex = signal(0);
  /** While the photo is zoomed in, the arrow keys move the photo instead of changing it. */
  protected readonly isZoomed = signal(false);
  protected readonly lang = this.languageStore.currentLang;
  protected readonly post = computed(() => this.photoPostsStore.findById(this.postId()));
  protected readonly photos = computed(() => this.post()?.photos ?? []);
  protected readonly activePhoto = computed(() => this.photos()[this.activeIndex()]);
  protected readonly counter = computed(() =>
    formatSetCounter(this.activeIndex() + 1, this.photos().length)
  );
  protected readonly isFirst = computed(() => this.activeIndex() === 0);
  protected readonly isLast = computed(() => this.activeIndex() === this.photos().length - 1);

  protected onArrowKey(direction: -1 | 1): void {
    if (this.isZoomed()) return;

    this.step(direction);
  }

  protected pick(index: number): void {
    this.activeIndex.set(index);
  }

  protected step(direction: -1 | 1): void {
    this.activeIndex.update((current) => stepIndex(current, this.photos().length, direction));
  }
}
