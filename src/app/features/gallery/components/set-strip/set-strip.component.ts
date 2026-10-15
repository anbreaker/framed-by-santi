import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PhotoCarouselComponent } from '@features/photo-posts/components/photo-carousel/photo-carousel.component';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

/** One set of the gallery: its title, date and size, the carousel with all its photos and a way into the set. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
    PhotoCarouselComponent,
    PluralKeyPipe,
    RouterLink,
    ScrollRevealDirective,
    TranslocoDirective,
  ],
  selector: 'app-set-strip',
  styleUrl: './set-strip.component.css',
  templateUrl: './set-strip.component.html',
})
export class SetStripComponent {
  private readonly languageStore = inject(LanguageStore);

  readonly post = input.required<PhotoPost>();

  protected readonly lang = this.languageStore.currentLang;
}
