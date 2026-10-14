import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageStore } from '@core/store/language.store';
import { Photo } from '@features/photo-posts/models/photo.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { ZoomablePhotoComponent } from './zoomable-photo.component';

describe('ZoomablePhotoComponent', () => {
  let fixture: ComponentFixture<ZoomablePhotoComponent>;
  let zoomedStates: boolean[];

  // Fits the 400 x 600 stage exactly, so at 2x it overflows by 200 px sideways and 300 px vertically.
  const photo: Photo = { alt: 'Portrait', height: 1500, id: 'post-test/01', width: 1000 };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const surface = (): HTMLElement => root().querySelector('.zoomable') as HTMLElement;
  const level = (): string =>
    (root().querySelector('.zoomable__level')?.textContent ?? '').replace(/ /g, ' ').trim();
  const transform = (): string =>
    (root().querySelector('.zoomable__content') as HTMLElement).style.transform;
  const button = (label: string): HTMLButtonElement =>
    root().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
  const click = async (label: string): Promise<void> => {
    button(label).click();
    await fixture.whenStable();
  };
  const pointer = (
    type: string,
    pointerId: number,
    x: number,
    y: number,
    time = 0,
    pointerType = 'touch'
  ): void => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      clientX: { value: x },
      clientY: { value: y },
      pointerId: { value: pointerId },
      pointerType: { value: pointerType },
      timeStamp: { value: time },
    });
    surface().dispatchEvent(event);
  };
  const tap = async (x: number, y: number, time: number): Promise<void> => {
    pointer('pointerdown', 1, x, y, time);
    pointer('pointerup', 1, x, y, time + 40);
    await fixture.whenStable();
  };
  const mouseClick = async (x: number, y: number, time: number): Promise<void> => {
    pointer('pointerdown', 1, x, y, time, 'mouse');
    pointer('pointerup', 1, x, y, time + 40, 'mouse');
    await fixture.whenStable();
  };
  const press = async (key: string): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
    window.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };

  beforeEach(async () => {
    localStorage.clear();
    zoomedStates = [];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 600,
      height: 600,
      left: 0,
      right: 400,
      toJSON: () => ({}),
      top: 0,
      width: 400,
      x: 0,
      y: 0,
    });

    await TestBed.configureTestingModule({
      imports: [ZoomablePhotoComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoomablePhotoComponent);
    fixture.componentRef.setInput('photo', photo);
    fixture.componentInstance.zoomedChange.subscribe((zoomed) => zoomedStates.push(zoomed));
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buttons', () => {
    it('should start unzoomed with only the zoom-in button available', () => {
      expect(level()).toBe('100%');
      expect(button('Zoom in').disabled).toBe(false);
      expect(button('Zoom out').disabled).toBe(true);
      expect(button('Reset zoom').disabled).toBe(true);
      expect(zoomedStates).toEqual([false]);
    });

    it('should zoom in and out in steps and report when the photo is zoomed', async () => {
      await click('Zoom in');
      expect(level()).toBe('150%');
      expect(zoomedStates.at(-1)).toBe(true);

      await click('Zoom out');
      expect(level()).toBe('100%');
      expect(zoomedStates.at(-1)).toBe(false);
    });

    it('should stop at the maximum zoom', async () => {
      for (let step = 0; step < 10; step++) await click('Zoom in');

      expect(level()).toBe('400%');
      expect(button('Zoom in').disabled).toBe(true);
    });

    it('should reset the zoom and the position', async () => {
      await click('Zoom in');
      await click('Zoom in');
      await click('Reset zoom');

      expect(level()).toBe('100%');
      expect(transform()).toBe('translate(0px, 0px) scale(1)');
    });

    it('should name the buttons and the zoom level in the active language', async () => {
      TestBed.inject(LanguageStore).setLang('es');
      await fixture.whenStable();
      await click('Acercar');
      await click('Acercar');

      expect(button('Alejar')).not.toBeNull();
      expect(button('Restablecer zoom')).not.toBeNull();
      expect(level()).toBe('225 %');
    });
  });

  describe('wheel', () => {
    it('should zoom with Ctrl or Cmd and the wheel without letting the browser zoom the page', async () => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 300,
        ctrlKey: true,
        deltaY: -50,
      });
      surface().dispatchEvent(event);
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(true);
      expect(level()).not.toBe('100%');
    });

    it('should leave a plain wheel alone so the page keeps scrolling', async () => {
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -50,
      });
      surface().dispatchEvent(event);
      await fixture.whenStable();

      expect(event.defaultPrevented).toBe(false);
      expect(level()).toBe('100%');
    });
  });

  describe('mouse click', () => {
    it('should zoom in with a single click and zoom out with the next one', async () => {
      await mouseClick(200, 300, 1000);
      expect(level()).toBe('250%');

      await mouseClick(200, 300, 2000);
      expect(level()).toBe('100%');
    });

    it('should not need a double click', async () => {
      await mouseClick(200, 300, 1000);
      await mouseClick(200, 300, 1100);

      // Two quick clicks are just two toggles, not a special gesture.
      expect(level()).toBe('100%');
    });

    it('should ignore a mouse drag that is not a click', async () => {
      pointer('pointerdown', 1, 200, 300, 1000, 'mouse');
      pointer('pointermove', 1, 260, 340, 1050, 'mouse');
      pointer('pointerup', 1, 260, 340, 1100, 'mouse');
      await fixture.whenStable();

      expect(level()).toBe('100%');
    });
  });

  describe('double tap on touch screens', () => {
    it('should not zoom with a single touch tap', async () => {
      await tap(200, 300, 1000);

      expect(level()).toBe('100%');
    });

    it('should zoom in on a double tap and zoom out on the next one', async () => {
      await tap(200, 300, 1000);
      expect(level()).toBe('100%');

      await tap(200, 300, 1200);
      expect(level()).toBe('250%');

      await tap(200, 300, 3000);
      await tap(200, 300, 3200);
      expect(level()).toBe('100%');
    });

    it('should ignore two taps that are too far apart in time or space', async () => {
      await tap(200, 300, 1000);
      await tap(200, 300, 1500);
      expect(level()).toBe('100%');

      await tap(50, 50, 4000);
      await tap(350, 550, 4100);
      expect(level()).toBe('100%');
    });
  });

  describe('drag', () => {
    const zoomInAtCentre = async (): Promise<void> => {
      await tap(200, 300, 1000);
      await tap(200, 300, 1200);
    };

    it('should move the photo while it is zoomed in', async () => {
      await zoomInAtCentre();

      pointer('pointerdown', 1, 200, 300, 5000);
      pointer('pointermove', 1, 250, 300, 5050);
      pointer('pointerup', 1, 250, 300, 5400);
      await fixture.whenStable();

      expect(transform()).toBe('translate(50px, 0px) scale(2.5)');
    });

    it('should not drag the photo beyond its own edges', async () => {
      await zoomInAtCentre();

      pointer('pointerdown', 1, 200, 300, 5000);
      pointer('pointermove', 1, 900, 900, 5050);
      pointer('pointerup', 1, 900, 900, 5400);
      await fixture.whenStable();

      // At 2.5x the photo overflows by 300 px sideways and 450 px vertically.
      expect(transform()).toBe('translate(300px, 450px) scale(2.5)');
    });

    it('should not move a photo that is not zoomed', async () => {
      pointer('pointerdown', 1, 200, 300, 5000);
      pointer('pointermove', 1, 260, 340, 5050);
      pointer('pointerup', 1, 260, 340, 5400);
      await fixture.whenStable();

      expect(transform()).toBe('translate(0px, 0px) scale(1)');
    });

    it('should switch to the grab cursor and stop page scrolling only while zoomed', async () => {
      expect(surface().classList.contains('zoomable--zoomed')).toBe(false);

      await zoomInAtCentre();

      expect(surface().classList.contains('zoomable--zoomed')).toBe(true);
    });
  });

  describe('pinch', () => {
    it('should follow the distance between two fingers', async () => {
      pointer('pointerdown', 1, 100, 300, 0);
      pointer('pointerdown', 2, 200, 300, 10);
      pointer('pointermove', 2, 300, 300, 50);
      await fixture.whenStable();

      expect(level()).toBe('200%');

      pointer('pointerup', 2, 300, 300, 100);
      pointer('pointerup', 1, 100, 300, 110);
      await fixture.whenStable();

      expect(level()).toBe('200%');
    });

    it('should not count a pinch as a tap', async () => {
      pointer('pointerdown', 1, 100, 300, 1000);
      pointer('pointerdown', 2, 200, 300, 1010);
      pointer('pointerup', 2, 200, 300, 1040);
      pointer('pointerup', 1, 100, 300, 1050);
      await tap(100, 300, 1150);

      expect(level()).toBe('100%');
    });
  });

  describe('keyboard', () => {
    it('should zoom with + and -, and reset with 0 or Escape', async () => {
      await press('+');
      expect(level()).toBe('150%');
      await press('=');
      expect(level()).toBe('225%');
      await press('-');
      expect(level()).toBe('150%');
      await press('0');
      expect(level()).toBe('100%');

      await press('+');
      await press('Escape');
      expect(level()).toBe('100%');
    });

    it('should pan with the arrow keys only while zoomed', async () => {
      const ignored = await press('ArrowRight');
      expect(ignored.defaultPrevented).toBe(false);
      expect(transform()).toBe('translate(0px, 0px) scale(1)');

      await press('+');
      await press('+');
      const handled = await press('ArrowRight');

      expect(handled.defaultPrevented).toBe(true);
      expect(transform()).toBe('translate(-80px, 0px) scale(2.25)');
    });

    it('should ignore shortcuts used together with Ctrl, Cmd or Alt', async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '+' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', metaKey: true }));
      await fixture.whenStable();

      expect(level()).toBe('100%');
    });
  });
});
