import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { portraitFor } from '@features/site-settings/utils/portrait';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, RouterLink, ScrollRevealDirective, TranslocoDirective],
  selector: 'app-about-teaser',
  styleUrl: './about-teaser.component.css',
  templateUrl: './about-teaser.component.html',
})
export class AboutTeaserComponent {
  private readonly settings = inject(SiteSettingsStore);

  protected readonly ready = this.settings.ready;
  protected readonly portrait = computed(() => portraitFor(this.settings.profilePhoto()));
}
