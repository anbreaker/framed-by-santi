import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { SetStageComponent } from './set-stage.component';

describe('SetStageComponent', () => {
  let fixture: ComponentFixture<SetStageComponent>;
  let nextRequests: number;
  let previousRequests: number;

  const photo: Photo = { alt: 'Cyclist', height: 912, id: 'post-1/01', width: 1392 };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const stage = (): HTMLElement => root().querySelector('.set-stage') as HTMLElement;
  const arrow = (name: 'next' | 'previous'): HTMLButtonElement =>
    root().querySelector(`.set-stage__arrow--${name}`) as HTMLButtonElement;
  const swipe = (type: string, clientX: number, pointerType = 'touch'): void => {
    const event = new Event(type, { bubbles: true }) as PointerEvent;
    Object.defineProperties(event, {
      clientX: { value: clientX },
      pointerType: { value: pointerType },
    });
    stage().dispatchEvent(event);
  };

  beforeEach(async () => {
    localStorage.clear();
    nextRequests = 0;
    previousRequests = 0;

    await TestBed.configureTestingModule({
      imports: [SetStageComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SetStageComponent);
    fixture.componentRef.setInput('photo', photo);
    fixture.componentInstance.next.subscribe(() => nextRequests++);
    fixture.componentInstance.previous.subscribe(() => previousRequests++);
    await fixture.whenStable();
  });

  it('should show the photo at its real size with high priority', () => {
    const image = root().querySelector('img') as HTMLImageElement;

    expect(image.getAttribute('src')).toBe('/local-photos/post-1/01.webp');
    expect(image.getAttribute('fetchpriority')).toBe('high');
  });

  it('should carry the shared transition name so the cover can morph into it', async () => {
    fixture.componentRef.setInput('transitionName', 'cover-post-1');
    await fixture.whenStable();

    const frame = root().querySelector('.set-stage__frame') as HTMLElement;

    expect(frame.style.getPropertyValue('view-transition-name')).toBe('cover-post-1');
  });

  it('should request the next and the previous photo from the arrows', () => {
    arrow('next').click();
    arrow('previous').click();

    expect(nextRequests).toBe(1);
    expect(previousRequests).toBe(1);
  });

  it('should disable the arrows at the ends of the set', async () => {
    fixture.componentRef.setInput('isFirst', true);
    fixture.componentRef.setInput('isLast', true);
    await fixture.whenStable();

    expect(arrow('previous').disabled).toBe(true);
    expect(arrow('next').disabled).toBe(true);
  });

  it('should name the arrows in the active language', () => {
    expect(arrow('next').getAttribute('aria-label')).toBe('Next photo');
    expect(arrow('previous').getAttribute('aria-label')).toBe('Previous photo');
  });

  it('should go to the next photo when swiping left and to the previous when swiping right', () => {
    swipe('pointerdown', 300);
    swipe('pointerup', 100);
    swipe('pointerdown', 100);
    swipe('pointerup', 300);

    expect(nextRequests).toBe(1);
    expect(previousRequests).toBe(1);
  });

  it('should ignore short drags, mouse drags and cancelled gestures', () => {
    swipe('pointerdown', 300);
    swipe('pointerup', 290);
    swipe('pointerdown', 300, 'mouse');
    swipe('pointerup', 100, 'mouse');
    swipe('pointerdown', 300);
    swipe('pointercancel', 300);
    swipe('pointerup', 100);

    expect(nextRequests + previousRequests).toBe(0);
  });

  it('should not swipe past the ends of the set', async () => {
    fixture.componentRef.setInput('isFirst', true);
    fixture.componentRef.setInput('isLast', true);
    await fixture.whenStable();

    swipe('pointerdown', 300);
    swipe('pointerup', 100);
    swipe('pointerdown', 100);
    swipe('pointerup', 300);

    expect(nextRequests + previousRequests).toBe(0);
  });

  describe('changing photo', () => {
    const second: Photo = { alt: 'Second', height: 912, id: 'post-1/02', width: 1392 };
    const third: Photo = { alt: 'Third', height: 912, id: 'post-1/03', width: 1392 };
    const sources = (): string[] =>
      Array.from(root().querySelectorAll('.set-stage__frame > app-zoomable-photo img')).map(
        (image) => (image as HTMLImageElement).getAttribute('src') ?? ''
      );
    const incoming = (): HTMLElement | null => root().querySelector('.set-stage__photo--incoming');
    // Fake timers and `whenStable` do not mix, so changes are flushed by hand.
    const flush = async (ms = 0): Promise<void> => {
      await vi.advanceTimersByTimeAsync(ms);
      fixture.detectChanges();
    };
    const arrived = async (): Promise<void> => {
      incoming()?.querySelector('img')?.dispatchEvent(new Event('load'));
      await flush();
    };
    const change = async (next: Photo): Promise<void> => {
      fixture.componentRef.setInput('photo', next);
      await flush();
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should keep the current photo alone on screen while the next one is still loading', async () => {
      await change(second);

      expect(root().querySelector('.set-stage__photo--revealing')).toBeNull();
      expect(incoming()?.querySelector('img')?.getAttribute('src')).toBe('/local-photos/post-1/02.webp');
    });

    it('should dissolve the new photo in over the old one once it has arrived, then keep only the new one', async () => {
      await change(second);
      await arrived();

      expect(root().querySelector('.set-stage__photo--revealing')).not.toBeNull();
      expect(sources()).toEqual(['/local-photos/post-1/01.webp', '/local-photos/post-1/02.webp']);

      await flush(700);

      expect(sources()).toEqual(['/local-photos/post-1/02.webp']);
      expect(incoming()).toBeNull();
      expect(root().querySelector('.set-stage__photo--revealing')).toBeNull();
    });

    it('should keep the very same photo element when the dissolve ends, so nothing flickers', async () => {
      await change(second);
      const element = incoming();
      await arrived();
      await flush(700);

      expect(root().querySelector('.set-stage__frame > app-zoomable-photo')).toBe(element);
    });

    it('should not replay the entrance fade on a photo that has just been dissolved in', async () => {
      expect(root().querySelector('.set-stage__photo--enter')).not.toBeNull();

      await change(second);
      await arrived();
      await flush(700);

      expect(root().querySelector('.set-stage__photo--enter')).toBeNull();
    });

    it('should swap anyway when the new photo takes too long, instead of staying stuck', async () => {
      await change(second);

      await flush(2600);
      await flush(700);

      expect(sources()).toEqual(['/local-photos/post-1/02.webp']);
    });

    it('should follow the last request when the visitor jumps around quickly', async () => {
      await change(second);
      await change(third);
      await arrived();
      await flush(700);

      expect(sources()).toEqual(['/local-photos/post-1/03.webp']);
    });

    it('should finish a dissolve in progress before starting the next change', async () => {
      await change(second);
      await arrived();
      await flush(100);
      await change(third);

      expect(sources()[0]).toBe('/local-photos/post-1/02.webp');
      expect(incoming()?.querySelector('img')?.getAttribute('src')).toBe('/local-photos/post-1/03.webp');
    });

    it('should drop a pending change when the visitor goes back to the photo still on screen', async () => {
      await change(second);
      await change(photo);

      expect(incoming()).toBeNull();
      expect(sources()).toEqual(['/local-photos/post-1/01.webp']);
    });

    it('should not let the photo that is loading be touched or read out, and free it once it is on screen', async () => {
      await change(second);

      expect(incoming()?.hasAttribute('inert')).toBe(true);
      expect(incoming()?.getAttribute('aria-hidden')).toBe('true');

      const element = incoming();
      await arrived();
      await flush(700);

      expect(element?.hasAttribute('inert')).toBe(false);
      expect(element?.hasAttribute('aria-hidden')).toBe(false);
    });

    it('should show a single photo from the start', () => {
      expect(sources()).toHaveLength(1);
      expect(incoming()).toBeNull();
    });
  });
});
