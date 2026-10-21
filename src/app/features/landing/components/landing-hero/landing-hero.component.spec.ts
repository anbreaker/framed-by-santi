import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { INSTAGRAM_URL } from '@core/const/social.const';
import { LanguageStore } from '@core/store/language.store';
import { PhotoPostsStore } from '@features/photo-posts/store/photo-posts.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { LANDING_HERO_SOURCE } from '../../const/landing.const';
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

  it('should show the bundled hero photo as an eager image', () => {
    const image = root().querySelector('img') as HTMLImageElement;

    expect(image.getAttribute('src')).toBe(LANDING_HERO_SOURCE);
    expect(image.getAttribute('loading')).toBe('eager');
  });

  it('should keep the hero photo when the post is not among the published ones', async () => {
    const store = TestBed.inject(PhotoPostsStore);
    vi.spyOn(store, 'findById').mockReturnValue(undefined);
    fixture = TestBed.createComponent(LandingHeroComponent);
    await fixture.whenStable();

    expect(root().querySelector('img')?.getAttribute('src')).toBe(LANDING_HERO_SOURCE);
  });

  it('should link to the gallery and to Instagram without exposing a sign-in', () => {
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/gallery', INSTAGRAM_URL]);
  });

  it('should put the Instagram logo next to the Instagram button text', () => {
    const link = root().querySelector(`a[href="${INSTAGRAM_URL}"]`) as HTMLAnchorElement;

    expect(link.querySelector('app-instagram-icon svg[aria-hidden="true"]')).not.toBeNull();
    expect(link.textContent?.trim()).toBe('@framedbysanti');
  });

  it('should format the photo date for the active language', async () => {
    expect(root().querySelector('.landing-hero__caption')?.textContent).toContain('Aug 31, 2026');

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(root().querySelector('.landing-hero__caption')?.textContent).toContain('31 ago 2026');
    expect(root().textContent).toContain('Yo solo aprieto botones.');
  });
});
