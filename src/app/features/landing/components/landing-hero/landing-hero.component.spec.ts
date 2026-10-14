import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { INSTAGRAM_URL } from '@core/const/social.const';
import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { LANDING_HERO_POST_ID } from '../../const/landing.const';
import { LandingHeroComponent } from './landing-hero.component';

describe('LandingHeroComponent', () => {
  let fixture: ComponentFixture<LandingHeroComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LandingHeroComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingHeroComponent);
    await fixture.whenStable();
  });

  it('should open with the name as the page heading and the tagline', () => {
    expect(root().querySelector('h1')?.textContent).toContain('Santi García');
    expect(root().textContent).toContain('I just press buttons.');
  });

  it('should use the cover photo of the configured post as an eager hero image', () => {
    const cover = TestBed.inject(PhotoPostsStore).findById(LANDING_HERO_POST_ID)?.photos[0];
    const image = root().querySelector('img') as HTMLImageElement;

    expect(cover).toBeDefined();
    expect(image.getAttribute('src')).toBe(`/local-photos/${cover?.id}.webp`);
    expect(image.getAttribute('loading')).toBe('eager');
  });

  it('should link to the gallery and to Instagram without exposing a sign-in', () => {
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/gallery', INSTAGRAM_URL]);
  });

  it('should format the photo date for the active language', async () => {
    expect(root().querySelector('.landing-hero__caption')?.textContent).toContain('Aug 31, 2026');

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(root().querySelector('.landing-hero__caption')?.textContent).toContain('31 ago 2026');
    expect(root().textContent).toContain('Yo solo aprieto botones.');
  });
});
