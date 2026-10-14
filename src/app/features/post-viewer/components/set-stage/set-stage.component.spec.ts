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
});
