import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { formatSetCounter } from '@features/photo-posts/utils/set-counter';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

import { LATEST_SET_PREVIEW_COUNT } from '../../const/landing.const';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    PluralKeyPipe,
    PostPhotoComponent,
    RouterLink,
    ScrollRevealDirective,
    TranslocoDirective,
  ],
  selector: 'app-latest-set',
  styleUrl: './latest-set.component.css',
  templateUrl: './latest-set.component.html',
})
export class LatestSetComponent {
  private readonly languageStore = inject(LanguageStore);
  private readonly photoPostsStore = inject(PhotoPostsStore);

  protected readonly counter = formatSetCounter;
  protected readonly lang = this.languageStore.currentLang;
  protected readonly post = this.photoPostsStore.latestPost;
  protected readonly previewPhotos = computed(() =>
    this.post().photos.slice(0, LATEST_SET_PREVIEW_COUNT)
  );
}
