import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PROFILE_PHOTO } from '@features/about/const/profile-photo.const';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, RouterLink, ScrollRevealDirective, TranslocoDirective],
  selector: 'app-about-teaser',
  styleUrl: './about-teaser.component.css',
  templateUrl: './about-teaser.component.html',
})
export class AboutTeaserComponent {
  protected readonly profilePhoto = PROFILE_PHOTO;
}
