import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

export type RevealVariant = 'fade' | 'frame';

function canAnimate(): boolean {
  if (typeof IntersectionObserver === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Reveals the host when it enters the viewport: `fade` lifts it in, `frame` closes a frame around it.
 * Progressive enhancement: without IntersectionObserver or with reduced motion the host stays visible.
 */
@Directive({
  standalone: true,
  selector: '[appScrollReveal]',
})
export class ScrollRevealDirective {
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly appScrollReveal = input<RevealVariant | ''>('');

  constructor() {
    afterNextRender(() => this.observe());
  }

  private observe(): void {
    if (!canAnimate()) return;

    const host = this.element.nativeElement;
    host.classList.add('reveal', `reveal--${this.appScrollReveal() || 'fade'}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            entry.target.classList.add('reveal--in');
            observer.unobserve(entry.target);
          });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    observer.observe(host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
