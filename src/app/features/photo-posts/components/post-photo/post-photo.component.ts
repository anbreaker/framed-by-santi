import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Photo } from '../../models/photo.model';
import { photoSrcset, photoUrl } from '../../utils/photo-url';

/** Renders one photo at its real ratio; the parent decides the size through CSS variables. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-post-photo',
  styleUrl: './post-photo.component.css',
  templateUrl: './post-photo.component.html',
})
export class PostPhotoComponent {
  /** Overrides the photo's own alt text, for example with a translated one. */
  readonly alt = input<string | null>(null);
  /** Eager photos load with high priority; use it for the first screen only. */
  readonly eager = input(false);
  readonly photo = input.required<Photo>();
  /** Rendered width of the image, so the browser downloads the smallest variant that looks sharp. */
  readonly sizes = input('100vw');

  protected readonly altText = computed(() => this.alt() ?? this.photo().alt);
  protected readonly src = computed(() => photoUrl(this.photo()));
  protected readonly srcset = computed(() => photoSrcset(this.photo()));
}
