import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { LATEST_SET_PREVIEW_COUNT } from '../../const/landing.const';
import { LatestSetComponent } from './latest-set.component';

describe('LatestSetComponent', () => {
  let fixture: ComponentFixture<LatestSetComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const latest = (): { id: string; photos: unknown[] } =>
    TestBed.inject(PhotoPostsStore).latestPost();

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LatestSetComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LatestSetComponent);
    await fixture.whenStable();
  });

  it('should preview only the first photos of the latest set', () => {
    expect(root().querySelectorAll('.latest-set__item')).toHaveLength(LATEST_SET_PREVIEW_COUNT);
    expect(latest().photos.length).toBeGreaterThan(LATEST_SET_PREVIEW_COUNT);
  });

  it('should number each photo against the full size of the set', () => {
    const counters = Array.from(root().querySelectorAll('.latest-set__counter')).map((counter) =>
      counter.textContent?.trim()
    );

    expect(counters[0]).toBe(`01 / ${String(latest().photos.length).padStart(2, '0')}`);
  });

  it('should link to the full set', () => {
    const link = root().querySelector('a.latest-set__cta') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe(`/gallery/${latest().id}`);
  });

  it('should write the photo count with the plural form of each language', async () => {
    expect(root().textContent).toContain('10 photos');

    TestBed.inject(LanguageStore).setLang('pt');
    await fixture.whenStable();

    expect(root().textContent).toContain('10 fotos');
    expect(root().textContent).toContain('2 de outubro de 2026');
  });
});
