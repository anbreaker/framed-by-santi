import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { PhotoPost } from '@features/photo-posts/models/photo-post.model';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { LatestSetComponent } from './latest-set.component';

describe('LatestSetComponent', () => {
  let fixture: ComponentFixture<LatestSetComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const latest = (): PhotoPost => TestBed.inject(PhotoPostsStore).latestPost() as PhotoPost;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LatestSetComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LatestSetComponent);
    await fixture.whenStable();
  });

  it('should show every photo of the latest set', () => {
    expect(root().querySelectorAll('.latest-set__item')).toHaveLength(latest().photos.length);
  });

  it('should offer the gallery next to the full set', () => {
    const hrefs = Array.from(root().querySelectorAll('.latest-set__actions a')).map((link) =>
      link.getAttribute('href')
    );

    expect(hrefs).toEqual(['/gallery', `/gallery/${latest().id}`]);
  });

  it('should number each photo against the full size of the set', () => {
    const counters = Array.from(root().querySelectorAll('.latest-set__counter')).map((counter) =>
      counter.textContent?.trim()
    );

    expect(counters[0]).toBe(`01 / ${String(latest().photos.length).padStart(2, '0')}`);
  });

  it('should link to the full set', () => {
    const link = root().querySelector('a.btn--ghost') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe(`/gallery/${latest().id}`);
  });

  it('should write the photo count with the plural form of each language', async () => {
    expect(root().textContent).toContain('10 photos');

    TestBed.inject(LanguageStore).setLang('pt');
    await fixture.whenStable();

    expect(root().textContent).toContain('10 fotos');
    expect(root().textContent).toContain('2 de outubro de 2026');
  });

  it('should offer previous and next arrows, with previous disabled at the start', () => {
    const arrows = Array.from(root().querySelectorAll<HTMLButtonElement>('.latest-set__arrow'));

    expect(arrows.map((arrow) => arrow.getAttribute('aria-label'))).toEqual([
      'Previous photo',
      'Next photo',
    ]);
    expect(arrows[0].disabled).toBe(true);
    expect(arrows[1].disabled).toBe(false);
  });

  it('should scroll the strip when an arrow is pressed', () => {
    const strip = root().querySelector('.latest-set__strip') as HTMLElement;
    const scrollBy = vi.fn();
    strip.scrollBy = scrollBy;

    (root().querySelectorAll('.latest-set__arrow')[1] as HTMLButtonElement).click();

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));
  });

  it('should animate the arrow scroll unless the visitor asked for reduced motion', () => {
    const strip = root().querySelector('.latest-set__strip') as HTMLElement;
    const scrollBy = vi.fn();
    strip.scrollBy = scrollBy;
    const next = root().querySelectorAll('.latest-set__arrow')[1] as HTMLButtonElement;

    next.click();
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    next.click();
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });

  describe('opening a photo', () => {
    const strip = (): HTMLElement => root().querySelector('.latest-set__strip') as HTMLElement;
    const links = (): HTMLAnchorElement[] =>
      Array.from(root().querySelectorAll('.latest-set__link')) as HTMLAnchorElement[];
    const pointer = (target: EventTarget, type: string, clientX: number): void => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
      Object.assign(event, { pointerId: 1, pointerType: 'mouse' });
      target.dispatchEvent(event);
    };
    const click = (link: HTMLAnchorElement): MouseEvent => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      return event;
    };

    it('should link every photo to the viewer, opened on that very photo', () => {
      const post = latest();

      expect(links().map((link) => link.getAttribute('href'))).toEqual(
        post.photos.map((_, index) => `/gallery/${post.id}?photo=${index + 1}`)
      );
    });

    it('should name each link for assistive technology', () => {
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

    it('should open a photo again after a drag, with a fresh press', () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      pointer(strip(), 'pointerdown', 300);
      pointer(strip(), 'pointermove', 200);
      pointer(strip(), 'pointerup', 200);
      pointer(strip(), 'pointerdown', 150);
      pointer(strip(), 'pointerup', 150);
      click(links()[2]);

      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('should give only the pressed photo the name its transition to the viewer needs', async () => {
      const post = latest();
      const named = (): (string | null)[] =>
        Array.from(root().querySelectorAll('app-post-photo')).map(
          (photo) => (photo as HTMLElement).style.getPropertyValue('view-transition-name') || null
        );

      pointer(links()[3], 'pointerdown', 100);
      await fixture.whenStable();

      expect(named().filter((name) => name !== null)).toEqual([`cover-${post.id}`]);
      expect(named()[3]).toBe(`cover-${post.id}`);
    });
  });

  describe('dragging with the mouse', () => {
    const strip = (): HTMLElement => root().querySelector('.latest-set__strip') as HTMLElement;
    const fire = (type: string, clientX: number, pointerType = 'mouse'): void => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX });
      Object.assign(event, { pointerId: 1, pointerType });
      strip().dispatchEvent(event);
    };

    it('should move the strip with the pointer while the button is held', async () => {
      strip().scrollLeft = 200;

      fire('pointerdown', 300);
      fire('pointermove', 240);
      await fixture.whenStable();

      expect(strip().scrollLeft).toBe(260);
      expect(strip().classList).toContain('latest-set__strip--dragging');

      fire('pointerup', 240);
      await fixture.whenStable();

      expect(strip().classList).not.toContain('latest-set__strip--dragging');
    });

    it('should stop following the pointer once the button is released', () => {
      strip().scrollLeft = 200;

      fire('pointerdown', 300);
      fire('pointerup', 300);
      fire('pointermove', 100);

      expect(strip().scrollLeft).toBe(200);
    });

    it('should keep the browser from starting its own drag of a photo', () => {
      const image = strip().querySelector('img') as HTMLImageElement;
      const event = new Event('dragstart', { bubbles: true, cancelable: true });

      image.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should leave touch to the native scrolling', () => {
      strip().scrollLeft = 200;

      fire('pointerdown', 300, 'touch');
      fire('pointermove', 100, 'touch');

      expect(strip().scrollLeft).toBe(200);
    });
  });

  describe('while the published sets are still loading', () => {
    it('should hold its place so the page below does not jump when the set arrives', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LatestSetComponent, realTranslations()],
        providers: [
          provideRouter([]),
          { provide: PhotoPostsStore, useValue: { latestPost: signal(undefined), ready: signal(false) } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(LatestSetComponent);
      await fixture.whenStable();

      expect(root().classList).toContain('latest-set--loading');
      expect(root().querySelector('.latest-set__strip')).toBeNull();
    });

    it('should not reserve space once the sets have loaded', () => {
      expect(root().classList).not.toContain('latest-set--loading');
    });
  });
});
