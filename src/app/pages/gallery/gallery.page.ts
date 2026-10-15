import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostGridComponent } from '@features/gallery/components/post-grid/post-grid.component';
import { TagFilterComponent } from '@features/gallery/components/tag-filter/tag-filter.component';
import { isPostTag } from '@features/photo-posts/models/post-tag.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PluralKeyPipe,
    PostGridComponent,
    ScrollRevealDirective,
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

  protected readonly availableTags = this.photoPostsStore.availableTags;
  protected readonly lang = this.languageStore.currentLang;
  protected readonly selectedTag = computed(() => {
    const requested = this.tag();

    return isPostTag(requested) ? requested : null;
  });
  protected readonly visiblePosts = computed(() =>
    this.photoPostsStore.filterByTag(this.selectedTag())
  );
  protected readonly postCount = computed(() => this.visiblePosts().length);
}
