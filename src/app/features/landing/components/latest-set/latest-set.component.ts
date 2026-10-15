import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PhotoCarouselComponent } from '@features/photo-posts/components/photo-carousel/photo-carousel.component';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
    PhotoCarouselComponent,
    PluralKeyPipe,
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

  protected readonly lang = this.languageStore.currentLang;
  protected readonly post = this.photoPostsStore.latestPost;
  protected readonly ready = this.photoPostsStore.ready;
}
