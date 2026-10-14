import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { INSTAGRAM_URL } from '@core/const/social.const';
import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';

import { LANDING_HERO_POST_ID } from '../../const/landing.const';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    PostPhotoComponent,
    RouterLink,
    ScrollRevealDirective,
    TranslocoDirective,
  ],
  selector: 'app-landing-hero',
  styleUrl: './landing-hero.component.css',
  templateUrl: './landing-hero.component.html',
})
export class LandingHeroComponent {
  private readonly languageStore = inject(LanguageStore);
  private readonly photoPostsStore = inject(PhotoPostsStore);

  protected readonly heroPost = computed(() => this.photoPostsStore.findById(LANDING_HERO_POST_ID));
  protected readonly instagramUrl = INSTAGRAM_URL;
  protected readonly lang = this.languageStore.currentLang;
}
