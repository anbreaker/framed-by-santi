import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  /** A plain `#hash` link would resolve against `<base href="/">` and navigate home. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main-content')?.focus();
  }
}
