import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { useNoIndex } from '@shared/utils/use-noindex';

/** Shown for any address the site does not have, so a mistyped link never looks like a working page. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective],
  selector: 'app-not-found-page',
  styleUrl: './not-found.page.css',
  templateUrl: './not-found.page.html',
})
export class NotFoundPageComponent {
  constructor() {
    useNoIndex();
  }
}
