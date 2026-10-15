import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photo } from '@features/photo-posts/models/photo.model';
import { realTranslations } from '@shared/testing/transloco-testing';

import { SetStageComponent } from './set-stage.component';

describe('SetStageComponent with zoom', () => {
  let fixture: ComponentFixture<SetStageComponent>;
  let nextRequests: number;
  let zoomedStates: boolean[];

  const photo: Photo = { alt: 'Portrait', height: 1500, id: 'post-test/01', width: 1000 };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const stage = (): HTMLElement => root().querySelector('.set-stage') as HTMLElement;
  const pointer = (type: string, pointerId: number, clientX: number): void => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      clientX: { value: clientX },
      clientY: { value: 300 },
      pointerId: { value: pointerId },
      pointerType: { value: 'touch' },
      timeStamp: { value: 0 },
    });
    stage().dispatchEvent(event);
  };
  const zoomIn = async (): Promise<void> => {
    (root().querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    nextRequests = 0;
    zoomedStates = [];

    await TestBed.configureTestingModule({
      imports: [SetStageComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SetStageComponent);
    fixture.componentRef.setInput('photo', photo);
    fixture.componentInstance.next.subscribe(() => nextRequests++);
    fixture.componentInstance.zoomedChange.subscribe((zoomed) => zoomedStates.push(zoomed));
    await fixture.whenStable();
  });

  it('should tell the page when the photo is zoomed in and when it is not', async () => {
    expect(zoomedStates.at(-1)).toBe(false);

    await zoomIn();
    expect(zoomedStates.at(-1)).toBe(true);

    (root().querySelector('button[aria-label="Reset zoom"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(zoomedStates.at(-1)).toBe(false);
  });

  it('should swipe to the next photo when the photo is not zoomed', () => {
    pointer('pointerdown', 1, 300);
    pointer('pointerup', 1, 100);

    expect(nextRequests).toBe(1);
  });

  it('should not swipe while the photo is zoomed in, because dragging moves the photo', async () => {
    await zoomIn();

    pointer('pointerdown', 1, 300);
    pointer('pointerup', 1, 100);

    expect(nextRequests).toBe(0);
  });

  it('should not swipe at the end of a two finger pinch', () => {
    pointer('pointerdown', 1, 300);
    pointer('pointerdown', 2, 350);
    pointer('pointerup', 2, 350);
    pointer('pointerup', 1, 100);

    expect(nextRequests).toBe(0);
  });

  it('should reset the zoom when another photo is shown', async () => {
    await zoomIn();

    fixture.componentRef.setInput('photo', { ...photo, id: 'post-test/02' });
    await fixture.whenStable();

    expect(zoomedStates.at(-1)).toBe(false);
    expect(root().querySelector('.zoomable__level')?.textContent?.trim()).toBe('100%');
  });
});
