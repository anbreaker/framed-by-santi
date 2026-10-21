import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { realTranslations } from '@shared/testing/transloco-testing';

import { Congratulation } from '../../models/congratulation.model';
import { VideoFacadeComponent } from '../video-facade/video-facade.component';
import { CongratulationsCarouselComponent } from './congratulations-carousel.component';

const messages: Congratulation[] = [
  {
    from: 'Ana',
    id: 'ana',
    media: { kind: 'youtube', video: 'https://youtu.be/dQw4w9WgXcQ' },
    message: 'Happy birthday!',
  },
  {
    from: 'Bruno',
    id: 'bruno',
    media: { alt: 'Bruno and Santi', kind: 'photo', src: '/assets/congratulations/bruno.webp' },
    message: 'Line one\nLine two',
  },
  { from: 'Carla', id: 'carla', message: 'Just words.' },
];

@Component({
  imports: [CongratulationsCarouselComponent],
  template: '<app-congratulations-carousel [items]="items()" />',
})
class HostComponent {
  readonly items = signal<readonly Congratulation[]>(messages);
}

describe('CongratulationsCarouselComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const all = (selector: string): HTMLElement[] => Array.from(root().querySelectorAll(selector));
  const activeText = (): HTMLElement =>
    root().querySelector('.congrats__text--active') as HTMLElement;
  const activeMedia = (): HTMLElement =>
    root().querySelector('.congrats__media-slide--active') as HTMLElement;
  const button = (label: string): HTMLButtonElement =>
    root().querySelector(`.congrats__controls button[aria-label="${label}"]`) as HTMLButtonElement;
  const counter = (): string =>
    root().querySelector('.congrats__counter')?.textContent?.trim() ?? '';
  const fill = (): HTMLElement | null => root().querySelector('.congrats__fill');

  const press = async (label: string): Promise<void> => {
    button(label).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should announce the position when the visitor asks for less motion, since nothing passes on its own then', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    expect(root().querySelector('.congrats__counter')?.getAttribute('aria-live')).toBe('polite');
  });

  it('should resume the automatic pass when the video that was playing ends', async () => {
    (activeMedia().querySelector('.video-facade__poster') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fill()?.classList).toContain('congrats__fill--halted');

    const facade = fixture.debugElement.query(By.directive(VideoFacadeComponent));
    (facade.componentInstance as VideoFacadeComponent).ended.emit();
    await fixture.whenStable();

    expect(fill()?.classList).not.toContain('congrats__fill--halted');
    expect(activeText().textContent).toContain('Ana');
  });

  it('should be a labelled carousel that opens on the first message, with its sender and text', () => {
    const section = root().querySelector('section');

    expect(section?.getAttribute('aria-roledescription')).toBe('carousel');
    expect(section?.getAttribute('aria-label')).toBe('Congratulations');
    expect(activeText().querySelector('h2')?.textContent).toContain('Ana');
    expect(activeText().textContent).toContain('Happy birthday!');
    expect(activeText().getAttribute('aria-label')).toBe('1 of 3');
    expect(counter()).toBe('01 / 03');
  });

  it('should keep the messages that are not shown out of reach of the keyboard and screen readers', () => {
    const hidden = all('.congrats__text').filter(
      (text) => !text.classList.contains('congrats__text--active')
    );

    expect(hidden).toHaveLength(2);
    hidden.forEach((text) => {
      expect(text.hasAttribute('inert')).toBe(true);
      expect(text.getAttribute('aria-hidden')).toBe('true');
    });
    expect(activeText().hasAttribute('inert')).toBe(false);
  });

  it('should move forward and back with the arrows, wrapping at both ends', async () => {
    await press('Next');
    expect(activeText().textContent).toContain('Bruno');
    expect(counter()).toBe('02 / 03');

    await press('Previous');
    await press('Previous');
    expect(activeText().textContent).toContain('Carla');
    expect(counter()).toBe('03 / 03');

    await press('Next');
    expect(activeText().textContent).toContain('Ana');
  });

  it('should jump to a message from its dot and mark that dot as the current one', async () => {
    await press('Go to message 3');

    expect(activeText().textContent).toContain('Carla');
    expect(button('Go to message 3').getAttribute('aria-current')).toBe('true');
    expect(button('Go to message 1').getAttribute('aria-current')).toBeNull();
  });

  it('should show a photo with its description, and a message without media on its own', async () => {
    await press('Next');
    const photo = activeMedia().querySelector('img');
    expect(photo?.getAttribute('src')).toBe('/assets/congratulations/bruno.webp');
    expect(photo?.getAttribute('alt')).toBe('Bruno and Santi');

    await press('Next');
    expect(activeMedia().querySelector('img, app-video-facade')).toBeNull();
    expect(activeMedia().querySelector('.congrats__quote')).not.toBeNull();
  });

  it('should pass to the next message on its own when the progress bar fills up', async () => {
    fill()?.dispatchEvent(new Event('animationend'));
    await fixture.whenStable();

    expect(activeText().textContent).toContain('Bruno');
  });

  it('should let the automatic pass be paused and resumed', async () => {
    await press('Pause autoplay');
    expect(fill()?.classList).toContain('congrats__fill--halted');
    expect(button('Resume autoplay')).not.toBeNull();

    await press('Resume autoplay');
    expect(fill()?.classList).not.toContain('congrats__fill--halted');
  });

  it('should hold the automatic pass while a video plays, and stop the video when the message changes', async () => {
    (activeMedia().querySelector('.video-facade__poster') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(activeMedia().querySelector('iframe')).not.toBeNull();
    expect(fill()?.classList).toContain('congrats__fill--halted');

    await press('Next');
    expect(root().querySelector('iframe')).toBeNull();
    expect(fill()?.classList).not.toContain('congrats__fill--halted');
  });

  it('should announce the position only while nothing moves on its own', async () => {
    expect(root().querySelector('.congrats__counter')?.getAttribute('aria-live')).toBe('off');

    await press('Pause autoplay');
    expect(root().querySelector('.congrats__counter')?.getAttribute('aria-live')).toBe('polite');
  });

  it('should leave out the controls when there is a single message', async () => {
    fixture.componentInstance.items.set([messages[2]]);
    await fixture.whenStable();

    expect(root().querySelector('.congrats__controls')).toBeNull();
    expect(activeText().textContent).toContain('Carla');
  });
});
