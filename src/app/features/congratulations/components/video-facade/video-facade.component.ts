import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslocoDirective } from '@jsverse/transloco';

import { VideoSource } from '../../utils/slide-media';

/** Origins the YouTube player loads from, opened ahead of the press so it starts sooner. */
const YOUTUBE_ORIGINS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];

/**
 * A video that costs only its thumbnail until someone presses play. The YouTube player weighs around a
 * megabyte of scripts, so it is created only when the parent says the video is playing.
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  selector: 'app-video-facade',
  styleUrl: './video-facade.component.css',
  templateUrl: './video-facade.component.html',
})
export class VideoFacadeComponent {
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  readonly playing = input(false);
  /** Name of the play button, for example "Play the video from Ana". */
  readonly playLabel = input.required<string>();
  /** Name of the player for assistive technology. */
  readonly title = input.required<string>();
  readonly video = input.required<VideoSource>();

  readonly play = output<void>();

  /** The player URL is built from a validated video id, so it is trusted as a frame source. */
  protected readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const video = this.video();

    return video.kind === 'youtube'
      ? this.sanitizer.bypassSecurityTrustResourceUrl(video.embedUrl)
      : null;
  });

  protected readonly fileUrl = computed(() => {
    const video = this.video();

    return video.kind === 'file' ? video.fileUrl : null;
  });

  /** Opens the connections the YouTube player needs, once per page, while the hand is still on its way. */
  protected warmUp(): void {
    if (this.video().kind !== 'youtube') return;

    for (const origin of YOUTUBE_ORIGINS) {
      if (this.document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;

      const link = this.document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      this.document.head.appendChild(link);
    }
  }
}
