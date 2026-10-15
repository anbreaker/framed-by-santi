import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { SetStripComponent } from '@features/gallery/components/set-strip/set-strip.component';
import { TagFilterComponent } from '@features/gallery/components/tag-filter/tag-filter.component';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PluralKeyPipe,
    ScrollRevealDirective,
    SetStripComponent,
    TagFilterComponent,
    TranslocoDirective,
  ],
  selector: 'app-gallery-page',
  styleUrl: './gallery.page.css',
  templateUrl: './gallery.page.html',
})
export class GalleryPageComponent {
  private readonly languageStore = inject(LanguageStore);
  private readonly photoPostsStore = inject(PhotoPostsStore);

  /** Bound from the `?tag=` query parameter by the router. */
  readonly tag = input<string | undefined>();

  protected readonly availableThemes = this.photoPostsStore.availableThemes;
  protected readonly lang = this.languageStore.currentLang;
  protected readonly selectedTag = computed(() => {
    const requested = this.tag();

    const known = this.photoPostsStore.themes().some((theme) => theme.id === requested);

    return known && requested !== undefined ? requested : null;
  });
  protected readonly visiblePosts = computed(() =>
    this.photoPostsStore.filterByTag(this.selectedTag())
  );
  protected readonly postCount = computed(() => this.visiblePosts().length);
  protected readonly ready = this.photoPostsStore.ready;
}
