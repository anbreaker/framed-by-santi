import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@core/const/social.const';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';

/** The camera, the city and where to find the work. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ScrollRevealDirective, TranslocoDirective],
  selector: 'app-about-details',
  styleUrl: './about-details.component.css',
  templateUrl: './about-details.component.html',
})
export class AboutDetailsComponent {
  protected readonly instagramHandle = INSTAGRAM_HANDLE;
  protected readonly instagramUrl = INSTAGRAM_URL;
}
