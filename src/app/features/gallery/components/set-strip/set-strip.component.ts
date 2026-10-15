import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';
import { LocalizedDatePipe } from '@shared/pipes/localized-date.pipe';
import { LocalizedTextPipe } from '@shared/pipes/localized-text.pipe';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

/** Photos of a set shown in the gallery; the rest are reached from the set itself. */
const PREVIEW_LIMIT = 5;

/** One set of the gallery: its title, date and size, a row with its first photos and a way into the whole set. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LocalizedDatePipe,
    LocalizedTextPipe,
    PluralKeyPipe,
    PostPhotoComponent,
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
  protected readonly left = computed(() => Math.max(0, this.post().photos.length - PREVIEW_LIMIT));
  protected readonly preview = computed(() => this.post().photos.slice(0, PREVIEW_LIMIT));
  /** Shared with the post viewer so the first photo morphs into the full one. */
  protected readonly viewTransitionName = computed(() => `cover-${this.post().id}`);
}
