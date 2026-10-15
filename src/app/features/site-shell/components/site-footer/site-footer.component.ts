import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { INSTAGRAM_URL, ROOTDEVS_URL } from '@core/const/social.const';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective],
  selector: 'app-site-footer',
  styleUrl: './site-footer.component.css',
  templateUrl: './site-footer.component.html',
})
export class SiteFooterComponent {
  protected readonly instagramUrl = INSTAGRAM_URL;

  protected readonly rootdevsUrl = ROOTDEVS_URL;

  protected readonly year = new Date().getFullYear();
}
