import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { coverRatio } from '@features/photo-posts/utils/cover-ratio';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';

import { PostTileComponent } from '../post-tile/post-tile.component';

/** Justified rows: every tile keeps the ratio of its cover and rows fill the full width. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostTileComponent, ScrollRevealDirective],
  selector: 'app-post-grid',
  styleUrl: './post-grid.component.css',
  templateUrl: './post-grid.component.html',
})
export class PostGridComponent {
  readonly posts = input.required<readonly PhotoPost[]>();

  protected readonly ratioOf = coverRatio;
}
