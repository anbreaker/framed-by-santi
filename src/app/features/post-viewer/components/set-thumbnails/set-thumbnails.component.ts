import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PostPhotoComponent } from '@features/photo-posts/components/post-photo/post-photo.component';
import { Photo } from '@features/photo-posts/models/photo.model';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostPhotoComponent, TranslocoDirective],
  selector: 'app-set-thumbnails',
  styleUrl: './set-thumbnails.component.css',
  templateUrl: './set-thumbnails.component.html',
})
export class SetThumbnailsComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly activeIndex = input.required<number>();
  readonly photos = input.required<readonly Photo[]>();

  readonly picked = output<number>();

  constructor() {
    afterRenderEffect(() => {
      const active = this.host.nativeElement.querySelector('[aria-current="true"]');

      active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }
}
