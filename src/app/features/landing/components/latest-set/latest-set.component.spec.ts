import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
    expect(root().querySelectorAll('.photo-carousel__item')).toHaveLength(latest().photos.length);
  });

  it('should offer the gallery next to the full set', () => {
    const hrefs = Array.from(root().querySelectorAll('.photo-carousel__extra a')).map((link) =>
      link.getAttribute('href')
    );

    expect(hrefs).toEqual(['/gallery', `/gallery/${latest().id}`]);
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
