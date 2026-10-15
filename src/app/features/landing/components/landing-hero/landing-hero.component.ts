import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { INSTAGRAM_URL } from '@core/const/social.const';
import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { LOCAL_PHOTO_POSTS } from '@features/photo-posts/data/local-photo-posts.data';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';

import { LANDING_HERO_POST_ID, LANDING_HERO_SOURCE } from '../../const/landing.const';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
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

  protected readonly heroPost = LOCAL_PHOTO_POSTS.find((post) => post.id === LANDING_HERO_POST_ID);
  protected readonly heroSource = LANDING_HERO_SOURCE;
  protected readonly instagramUrl = INSTAGRAM_URL;
  protected readonly lang = this.languageStore.currentLang;
}
