import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragScrollDirective } from './drag-scroll.directive';

@Component({
  standalone: true,
  imports: [DragScrollDirective],
  template: `
    <ul appDragScroll class="strip">
      <li><a class="link" href="#one">One</a></li>
    </ul>
  `,
})
class HostComponent {}

describe('DragScrollDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const strip = (): HTMLElement => fixture.nativeElement.querySelector('.strip') as HTMLElement;
  const link = (): HTMLAnchorElement => fixture.nativeElement.querySelector('.link') as HTMLAnchorElement;
  const pointer = (type: string, clientX: number, pointerType = 'mouse'): void => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
    Object.assign(event, { pointerId: 1, pointerType });
    strip().dispatchEvent(event);
  };
  const click = (): MouseEvent => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link().dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should move the scroll with the mouse while the button is held, and mark it', async () => {
    strip().scrollLeft = 200;

    pointer('pointerdown', 300);
    pointer('pointermove', 240);
    await fixture.whenStable();

    expect(strip().scrollLeft).toBe(260);
    expect(strip().classList).toContain('is-dragging');

    pointer('pointerup', 240);
    await fixture.whenStable();

    expect(strip().classList).not.toContain('is-dragging');
  });

  it('should treat a tiny movement as a click, not as a drag', async () => {
    strip().scrollLeft = 200;

    pointer('pointerdown', 300);
    pointer('pointermove', 298);
    await fixture.whenStable();

    expect(strip().scrollLeft).toBe(200);
    expect(strip().classList).not.toContain('is-dragging');
    expect(click().defaultPrevented).toBe(false);
  });

  it('should swallow the click that ends a drag, and only that one', () => {
    pointer('pointerdown', 300);
    pointer('pointermove', 200);
    pointer('pointerup', 200);

    expect(click().defaultPrevented).toBe(true);
    expect(click().defaultPrevented).toBe(false);
  });

  it('should let a click through after a fresh press that did not move', () => {
    pointer('pointerdown', 300);
    pointer('pointermove', 200);
    pointer('pointerup', 200);
    pointer('pointerdown', 150);
    pointer('pointerup', 150);

    expect(click().defaultPrevented).toBe(false);
  });

  it('should stop following the pointer once the button is released', () => {
    strip().scrollLeft = 200;

    pointer('pointerdown', 300);
    pointer('pointerup', 300);
    pointer('pointermove', 100);

    expect(strip().scrollLeft).toBe(200);
  });

  it('should leave touch to the native scrolling', () => {
    strip().scrollLeft = 200;

    pointer('pointerdown', 300, 'touch');
    pointer('pointermove', 100, 'touch');

    expect(strip().scrollLeft).toBe(200);
  });

  it('should keep the browser from starting its own drag of an image or link', () => {
    const event = new Event('dragstart', { bubbles: true, cancelable: true });

    link().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
