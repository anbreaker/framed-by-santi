import { filter, map } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { SiteFooterComponent } from '@features/site-shell/components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '@features/site-shell/components/site-header/site-header.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteFooterComponent, SiteHeaderComponent, TranslocoDirective],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  /**
   * The footer waits for the first page. Before it, the footer would sit under the header, then be pushed
   * thousands of pixels down when the page arrives, which counts as a big layout shift.
   */
  protected readonly pageReady = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => true)
    ),
    { initialValue: false }
  );

  /** A plain `#hash` link would resolve against `<base href="/">` and navigate home. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main-content')?.focus();
  }
}
