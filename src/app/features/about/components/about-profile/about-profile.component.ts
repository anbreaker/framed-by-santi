import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';

import { PROFILE_PHOTO, PROFILE_PHOTO_SOURCE } from '../../const/profile-photo.const';

/** Portrait, name and a few words about Santi. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, ScrollRevealDirective, TranslocoDirective],
  selector: 'app-about-profile',
  styleUrl: './about-profile.component.css',
  templateUrl: './about-profile.component.html',
})
export class AboutProfileComponent {
  protected readonly profilePhoto = PROFILE_PHOTO;
  protected readonly profileSource = PROFILE_PHOTO_SOURCE;
}
