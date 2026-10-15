import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { PhotoCarouselComponent } from './photo-carousel.component';

@Component({
  standalone: true,
  imports: [PhotoCarouselComponent],
  template: `
    <app-photo-carousel [label]="'Fresh from the street'" [post]="post()">
      <a class="extra" href="/somewhere">Extra</a>
    </app-photo-carousel>
  `,
})
class HostComponent {
  readonly post = input.required<PhotoPost>();
}

describe('PhotoCarouselComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let post: PhotoPost;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const strip = (): HTMLElement => root().querySelector('.photo-carousel__strip') as HTMLElement;
  const links = (): HTMLAnchorElement[] =>
    Array.from(root().querySelectorAll('.photo-carousel__link')) as HTMLAnchorElement[];
  const arrow = (index: number): HTMLButtonElement =>
    root().querySelectorAll('.photo-carousel__arrow')[index] as HTMLButtonElement;
  const pointer = (target: EventTarget, type: string, clientX: number): void => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
    Object.assign(event, { pointerId: 1, pointerType: 'mouse' });
    target.dispatchEvent(event);
  };
  const click = (link: HTMLAnchorElement): void => {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HostComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    post = TestBed.inject(PhotoPostsStore).findById('post-1') as PhotoPost;
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('post', post);
    await fixture.whenStable();
  });

  it('should show every photo of the set, numbered against its full size', () => {
    const counters = Array.from(root().querySelectorAll('.photo-carousel__counter')).map(
      (counter) => counter.textContent?.trim()
    );

    expect(root().querySelectorAll('.photo-carousel__item')).toHaveLength(post.photos.length);
    expect(counters[0]).toBe(`01 / ${String(post.photos.length).padStart(2, '0')}`);
  });

  it('should label the strip with what the page calls it', () => {
    expect(strip().getAttribute('aria-label')).toBe('Fresh from the street');
  });

  it('should show what the page puts inside it next to the arrows', () => {
    expect(root().querySelector('.photo-carousel__footer .extra')).not.toBeNull();
  });

  it('should link every photo to the viewer, opened on that very photo, and name it', () => {
    expect(links().map((link) => link.getAttribute('href'))).toEqual(
      post.photos.map((_, index) => `/gallery/${post.id}?photo=${index + 1}`)
    );
    expect(links()[0].getAttribute('aria-label')).toContain('Open set:');
  });

  it('should open the photo on a plain click', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    click(links()[2]);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(String(navigate.mock.calls[0][0])).toContain('photo=3');
  });

  it('should not open the photo when the click ends a mouse drag', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    pointer(strip(), 'pointerdown', 300);
    pointer(strip(), 'pointermove', 200);
    pointer(strip(), 'pointerup', 200);
    click(links()[2]);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should give only the pressed photo the name its transition to the viewer needs', async () => {
    const named = (): (string | null)[] =>
      Array.from(root().querySelectorAll('app-post-photo')).map(
        (photo) => (photo as HTMLElement).style.getPropertyValue('view-transition-name') || null
      );

    pointer(links()[3], 'pointerdown', 100);
    await fixture.whenStable();

    expect(named().filter((name) => name !== null)).toEqual([`cover-${post.id}`]);
    expect(named()[3]).toBe(`cover-${post.id}`);
  });

  it('should offer previous and next arrows, with previous disabled at the start', () => {
    expect(root().querySelectorAll('.photo-carousel__arrow')).toHaveLength(2);
    expect(arrow(0).disabled).toBe(true);
  });

  it('should scroll the strip when an arrow is pressed', () => {
    const scrollBy = vi.fn();
    strip().scrollBy = scrollBy;

    arrow(1).click();

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));
  });

  it('should animate the arrow scroll unless the visitor asked for reduced motion', () => {
    const scrollBy = vi.fn();
    strip().scrollBy = scrollBy;

    arrow(1).click();
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    arrow(1).click();
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
