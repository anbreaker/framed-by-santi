import { afterNextRender, Directive, ElementRef, inject, signal } from '@angular/core';

/** Pixels the mouse must travel before a press counts as a drag, so a plain click still opens what is under it. */
const DRAG_THRESHOLD = 5;

/**
 * Lets a mouse drag a horizontally scrollable strip like a finger does; touch already scrolls natively.
 * While dragging the host gets the `is-dragging` class, and the click that ends a drag is swallowed so it
 * does not open the photo under the pointer.
 */
@Directive({
  standalone: true,
  selector: '[appDragScroll]',
  host: {
    '[class.is-dragging]': 'dragging()',
    // The browser would start its own drag of an image or link and cancel the pointer events.
    '(dragstart)': '$event.preventDefault()',
    '(pointercancel)': 'end()',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end()',
  },
})
export class DragScrollDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly dragging = signal(false);

  private moved = false;
  private origin = { left: 0, x: 0 };
  private pressed = false;

  constructor() {
    // Stopped in the capture phase, before the click reaches the link under the pointer.
    afterNextRender(() =>
      this.element.nativeElement.addEventListener(
        'click',
        (event) => {
          if (!this.moved) return;

          event.preventDefault();
          event.stopPropagation();
          this.moved = false;
        },
        true
      )
    );
  }

  protected start(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    this.origin = { left: this.element.nativeElement.scrollLeft, x: event.clientX };
    this.moved = false;
    this.pressed = true;
  }

  protected move(event: PointerEvent): void {
    if (!this.pressed) return;

    const strip = this.element.nativeElement;
    const distance = event.clientX - this.origin.x;

    if (!this.dragging()) {
      if (Math.abs(distance) < DRAG_THRESHOLD) return;

      this.dragging.set(true);
      this.moved = true;
      strip.setPointerCapture?.(event.pointerId);
    }

    strip.scrollLeft = this.origin.left - distance;
  }

  protected end(): void {
    this.pressed = false;
    this.dragging.set(false);
  }
}
