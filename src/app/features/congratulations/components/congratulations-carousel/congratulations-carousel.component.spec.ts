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
    createdAt: 1,
    id: 'ana',
    media: [{ kind: 'youtube', video: 'https://youtu.be/dQw4w9WgXcQ' }],
    message: 'Happy birthday!',
  },
  {
    from: 'Bruno',
    createdAt: 2,
    id: 'bruno',
    media: [
      { kind: 'photo', photo: { alt: 'Bruno and Santi', height: 600, id: 'bruno', width: 900 } },
      { kind: 'photo', photo: { alt: 'At the lake', height: 600, id: 'lake', width: 900 } },
    ],
    message: 'Line one\nLine two',
  },
  { createdAt: 3, from: 'Carla', id: 'carla', media: [], message: 'Just words.' },
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
  const photoFill = (): HTMLElement | null =>
    root().querySelector('.congrats__item-fill:not(.congrats__item-fill--done)');
  const photoButton = (label: string): HTMLButtonElement =>
    root().querySelector(`.congrats__item-nav button[aria-label="${label}"]`) as HTMLButtonElement;
  const shownItem = (): HTMLElement =>
    activeMedia().querySelector('.congrats__item--shown') as HTMLElement;
  const caption = (): string =>
    root().querySelector('.congrats__caption')?.textContent?.trim() ?? '';
  const shownPhoto = (): string | null | undefined =>
    shownItem()?.querySelector('img')?.getAttribute('alt');

  const press = async (label: string): Promise<void> => {
    button(label).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    // jsdom has no modal dialogs; the browser opens and closes them.
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
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
    expect(photo?.getAttribute('src')).toBe('/local-photos/bruno.webp');
    expect(photo?.getAttribute('alt')).toBe('Bruno and Santi');

    await press('Next');
    expect(activeMedia().querySelector('img, app-video-facade')).toBeNull();
    expect(activeMedia().querySelector('.congrats__quote')).not.toBeNull();
  });

  it('should keep the photo in its frame, and open it full screen to zoom in from a press on it', async () => {
    await press('Next');
    expect(all('app-zoomable-photo')).toHaveLength(0);

    const open = activeMedia().querySelector(
      'button[aria-label="See the photo from Bruno full screen"]'
    ) as HTMLButtonElement;
    expect(open.querySelector('img')?.getAttribute('alt')).toBe('Bruno and Santi');
    open.click();
    await fixture.whenStable();

    const dialog = root().querySelector('dialog') as HTMLDialogElement;
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(dialog.getAttribute('aria-label')).toBe('Photo from Bruno');
    expect(dialog.querySelector('app-zoomable-photo button[aria-label="Zoom in"]')).not.toBeNull();
    expect(dialog.querySelector('app-zoomable-photo img')?.getAttribute('alt')).toBe(
      'Bruno and Santi'
    );
  });

  it('should show the description of the photo under it and full screen, and none without a photo', async () => {
    expect(caption()).toBe('');

    await press('Next');
    expect(caption()).toBe('Bruno and Santi');

    (activeMedia().querySelector('.congrats__enlarge') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root().querySelector('dialog .congrats__viewer-caption')?.textContent?.trim()).toBe(
      'Bruno and Santi'
    );

    await press('Next');
    expect(caption()).toBe('');
  });

  it('should hold the automatic pass while the photo is full screen, and go on once it closes', async () => {
    await press('Next');
    (activeMedia().querySelector('.congrats__enlarge') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fill()?.classList).toContain('congrats__fill--halted');

    (root().querySelector('dialog button[aria-label="Close"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const dialog = root().querySelector('dialog') as HTMLDialogElement;
    expect(dialog.close).toHaveBeenCalled();

    dialog.dispatchEvent(new Event('close'));
    await fixture.whenStable();
    expect(dialog.querySelector('app-zoomable-photo')).toBeNull();
    expect(fill()?.classList).not.toContain('congrats__fill--halted');
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

  describe('with several photos in one message', () => {
    beforeEach(async () => {
      await press('Next');
    });

    it('should show the first photo, and say which one of how many it is', () => {
      expect(shownPhoto()).toBe('Bruno and Santi');
      expect(caption()).toBe('Bruno and Santi');
      expect(root().querySelector('.congrats__item-nav')?.getAttribute('aria-label')).toBe(
        'Photo or video 1 of 2'
      );
    });

    it('should go through the photos with their own arrows, wrapping at both ends, without changing the message', async () => {
      photoButton('Next photo or video').click();
      await fixture.whenStable();
      expect(shownPhoto()).toBe('At the lake');
      expect(caption()).toBe('At the lake');
      expect(root().querySelector('.congrats__item-nav')?.getAttribute('aria-label')).toBe(
        'Photo or video 2 of 2'
      );

      photoButton('Next photo or video').click();
      await fixture.whenStable();
      expect(shownPhoto()).toBe('Bruno and Santi');

      photoButton('Previous photo or video').click();
      await fixture.whenStable();
      expect(shownPhoto()).toBe('At the lake');
      expect(activeText().textContent).toContain('Bruno');
    });

    it('should pass to the next photo on its own when its bar fills up', async () => {
      photoFill()?.dispatchEvent(new Event('animationend'));
      await fixture.whenStable();

      expect(shownPhoto()).toBe('At the lake');
      expect(activeText().textContent).toContain('Bruno');
    });

    it('should stop the photos and the message while the pointer rests on the photo, and go on when it leaves', async () => {
      const media = root().querySelector('.congrats__media') as HTMLElement;

      media.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await fixture.whenStable();
      expect(photoFill()?.classList).toContain('congrats__item-fill--halted');
      expect(fill()?.classList).toContain('congrats__fill--halted');

      media.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      await fixture.whenStable();
      expect(photoFill()?.classList).not.toContain('congrats__item-fill--halted');
      expect(fill()?.classList).not.toContain('congrats__fill--halted');
    });

    it('should open full screen the photo being shown', async () => {
      photoButton('Next photo or video').click();
      await fixture.whenStable();
      (shownItem().querySelector('.congrats__enlarge') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(root().querySelector('dialog app-zoomable-photo img')?.getAttribute('alt')).toBe(
        'At the lake'
      );
    });

    it('should start again from the first photo when the message comes back', async () => {
      photoButton('Next photo or video').click();
      await fixture.whenStable();
      await press('Next');
      await press('Previous');

      expect(shownPhoto()).toBe('Bruno and Santi');
    });
  });

  it('should give the first photo of the next message its full time, even when it comes from another first photo', async () => {
    fixture.componentInstance.items.set([messages[1], { ...messages[1], id: 'again' }]);
    await fixture.whenStable();
    const before = photoFill();

    await press('Next');

    expect(photoFill()).not.toBeNull();
    expect(photoFill()).not.toBe(before);
  });

  it('should not hold the automatic pass when the photo is tapped on a touch screen', async () => {
    await press('Next');
    const media = root().querySelector('.congrats__media') as HTMLElement;

    media.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    await fixture.whenStable();
    expect(fill()?.classList).not.toContain('congrats__fill--halted');

    media.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await fixture.whenStable();
    expect(fill()?.classList).toContain('congrats__fill--halted');
  });

  describe('with photos and a video in one message', () => {
    beforeEach(async () => {
      fixture.componentInstance.items.set([
        {
          createdAt: 1,
          from: 'Dana',
          id: 'dana',
          media: [
            {
              kind: 'photo',
              photo: { alt: 'Dana and Santi', height: 600, id: 'dana', width: 900 },
            },
            { kind: 'youtube', video: 'dQw4w9WgXcQ' },
          ],
          message: 'Hugs',
        },
        messages[2],
      ]);
      await fixture.whenStable();
    });

    it('should pass from the photo to the video, with no description under the video', async () => {
      expect(caption()).toBe('Dana and Santi');

      photoButton('Next photo or video').click();
      await fixture.whenStable();

      expect(shownItem().querySelector('app-video-facade')).not.toBeNull();
      expect(caption()).toBe('');
      expect(root().querySelector('.congrats__item-nav')?.getAttribute('aria-label')).toBe(
        'Photo or video 2 of 2'
      );
    });

    it('should hold every automatic pass while the video plays, and stop it when another item comes in', async () => {
      photoButton('Next photo or video').click();
      await fixture.whenStable();
      (shownItem().querySelector('.video-facade__poster') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(shownItem().querySelector('iframe')).not.toBeNull();
      expect(photoFill()?.classList).toContain('congrats__item-fill--halted');
      expect(fill()?.classList).toContain('congrats__fill--halted');

      photoButton('Next photo or video').click();
      await fixture.whenStable();

      expect(root().querySelector('iframe')).toBeNull();
      expect(shownPhoto()).toBe('Dana and Santi');
      expect(fill()?.classList).not.toContain('congrats__fill--halted');
    });

    it('should count the video in the time the message stays', () => {
      expect(fill()?.style.getPropertyValue('--autoplay-duration')).toBe('10s');
    });
  });

  it('should have no photo arrows for a message with a single photo', async () => {
    const single = { alt: 'Bruno and Santi', height: 600, id: 'bruno', width: 900 };
    fixture.componentInstance.items.set([
      { ...messages[1], media: [{ kind: 'photo', photo: single }] },
    ]);
    await fixture.whenStable();

    expect(root().querySelector('.congrats__item-nav')).toBeNull();
    expect(shownPhoto()).toBe('Bruno and Santi');
  });

  it('should give each message time to read its words and see its photos', async () => {
    const duration = (): string => fill()?.style.getPropertyValue('--autoplay-duration') ?? '';
    expect(duration()).toBe('7s');

    const long = 'word '.repeat(360);
    const photo = { alt: '', height: 600, id: 'p', width: 900 };
    fixture.componentInstance.items.set([
      { ...messages[2], message: long.trim() },
      { ...messages[2], id: 'many', media: Array(4).fill({ kind: 'photo', photo }) },
      messages[2],
    ]);
    await fixture.whenStable();
    expect(duration()).toBe('100s');

    await press('Next');
    expect(duration()).toBe('20s');
  });

  it('should leave out the controls when there is a single message', async () => {
    fixture.componentInstance.items.set([messages[2]]);
    await fixture.whenStable();

    expect(root().querySelector('.congrats__controls')).toBeNull();
    expect(activeText().textContent).toContain('Carla');
  });
});
