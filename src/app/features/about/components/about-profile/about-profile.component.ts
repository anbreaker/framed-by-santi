import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { portraitFor } from '@features/site-settings/utils/portrait';

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
  private readonly settings = inject(SiteSettingsStore);

  protected readonly ready = this.settings.ready;
  protected readonly portrait = computed(() => portraitFor(this.settings.profilePhoto()));
}
