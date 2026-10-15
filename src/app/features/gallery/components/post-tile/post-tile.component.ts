import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { LanguageStore } from '@core/store/language.store';
import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PluralKeyPipe } from '@shared/pipes/plural-key.pipe';

/** One tile per post: the cover photo, a peek at the second one and a stack badge for sets. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PluralKeyPipe, PostPhotoComponent, RouterLink, TranslocoDirective],
  selector: 'app-post-tile',
  styleUrl: './post-tile.component.css',
  templateUrl: './post-tile.component.html',
})
export class PostTileComponent {
  private readonly languageStore = inject(LanguageStore);

  readonly post = input.required<PhotoPost>();

  /** Approximate tile width per breakpoint, from the justified rows of the grid. */
  protected readonly tileSizes = '(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw';

  protected readonly cover = computed(() => this.post().photos[0]);
  protected readonly isSet = computed(() => this.post().photos.length > 1);
  protected readonly lang = this.languageStore.currentLang;
  protected readonly peek = computed(() => this.post().photos[1] ?? null);
  /** Shared with the post viewer so the cover morphs into the full photo. */
  protected readonly viewTransitionName = computed(() => `cover-${this.post().id}`);
}
