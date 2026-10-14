import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostTag } from '@features/photo-posts/models/post-tag.model';

/** Theme filters as links to `?tag=`, so the filter survives reloads, sharing and back navigation. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective],
  selector: 'app-tag-filter',
  styleUrl: './tag-filter.component.css',
  templateUrl: './tag-filter.component.html',
})
export class TagFilterComponent {
  readonly selected = input<PostTag | null>(null);
  readonly tags = input.required<readonly PostTag[]>();
}
