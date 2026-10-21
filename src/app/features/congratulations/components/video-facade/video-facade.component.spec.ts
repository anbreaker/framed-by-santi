import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { VideoSource } from '../../utils/slide-media';
import { VideoFacadeComponent } from './video-facade.component';

const youtube: VideoSource = {
  embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1',
  kind: 'youtube',
  poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

const file: VideoSource = {
  fileUrl: 'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/congratulations/ana',
  kind: 'file',
  poster:
    'https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,w_1200/congratulations/ana.jpg',
};

@Component({
  imports: [VideoFacadeComponent],
  template: `
    <app-video-facade
      playLabel="Play the video from Ana"
      title="Video from Ana"
      [playing]="playing()"
      [video]="video()"
      (play)="plays = plays + 1"
    />
  `,
})
class HostComponent {
  plays = 0;
  readonly playing = signal(false);
  readonly video = signal<VideoSource>(youtube);
}

describe('VideoFacadeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const poster = (): HTMLButtonElement | null =>
    root().querySelector('button.video-facade__poster');

  beforeEach(async () => {
    localStorage.clear();
    document.head.querySelectorAll('link[rel="preconnect"]').forEach((link) => link.remove());
    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should show only the thumbnail and a labelled play button until the video is asked for', () => {
    expect(poster()?.getAttribute('aria-label')).toBe('Play the video from Ana');
    expect(poster()?.querySelector('img')?.getAttribute('src')).toBe(youtube.poster);
    expect(root().querySelector('iframe')).toBeNull();
    expect(root().querySelector('video')).toBeNull();
  });

  it('should ask for the video when the play button is pressed', () => {
    poster()?.click();

    expect(fixture.componentInstance.plays).toBe(1);
  });

  it('should load the YouTube player, with a title, only once it is playing', async () => {
    fixture.componentInstance.playing.set(true);
    await fixture.whenStable();

    const iframe = root().querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe(youtube.embedUrl);
    expect(iframe?.getAttribute('title')).toBe('Video from Ana');
    expect(iframe?.getAttribute('allow')).toContain('autoplay');
    expect(poster()).toBeNull();
  });

  it('should play a Cloudinary video in the browser player, with its controls', async () => {
    fixture.componentInstance.video.set(file);
    fixture.componentInstance.playing.set(true);
    await fixture.whenStable();

    const video = root().querySelector('video');
    expect(video?.getAttribute('src')).toBe(file.fileUrl);
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.getAttribute('aria-label')).toBe('Video from Ana');
    expect(root().querySelector('iframe')).toBeNull();
  });

  it('should warm up the connection to YouTube once, when the pointer reaches the play button', () => {
    poster()?.dispatchEvent(new Event('pointerenter'));
    poster()?.dispatchEvent(new Event('pointerenter'));

    const hrefs = Array.from(document.head.querySelectorAll('link[rel="preconnect"]')).map((link) =>
      link.getAttribute('href')
    );
    expect(hrefs).toEqual(['https://www.youtube-nocookie.com', 'https://www.youtube.com']);
  });
});
