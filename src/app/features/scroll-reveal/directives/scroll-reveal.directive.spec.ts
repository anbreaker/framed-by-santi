import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollRevealDirective } from './scroll-reveal.directive';

@Component({
  standalone: true,
  imports: [ScrollRevealDirective],
  selector: 'app-reveal-host',
  template: `
    <div appScrollReveal="frame" id="target"></div>
  `,
})
class RevealHostComponent {}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();

  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  emit(target: Element, isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe('ScrollRevealDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;

  const target = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector('#target') as HTMLElement;

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(RevealHostComponent);
    await fixture.whenStable();
  };

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should hide the host with the chosen variant and observe it', async () => {
    await render();

    expect(target().classList.contains('reveal')).toBe(true);
    expect(target().classList.contains('reveal--frame')).toBe(true);
    expect(FakeIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(target());
  });

  it('should reveal the host once and stop observing it when it enters the viewport', async () => {
    await render();
    const [observer] = FakeIntersectionObserver.instances;

    observer.emit(target(), false);
    expect(target().classList.contains('reveal--in')).toBe(false);

    observer.emit(target(), true);
    expect(target().classList.contains('reveal--in')).toBe(true);
    expect(observer.unobserve).toHaveBeenCalledWith(target());
  });

  it('should disconnect the observer when the host is destroyed', async () => {
    await render();

    fixture.destroy();

    expect(FakeIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
  });

  it('should leave the host visible when the visitor prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    await render();

    expect(target().classList.contains('reveal')).toBe(false);
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('should leave the host visible when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    await render();

    expect(target().classList.contains('reveal')).toBe(false);
  });
});
