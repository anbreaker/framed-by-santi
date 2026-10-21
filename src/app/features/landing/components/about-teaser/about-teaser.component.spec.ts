import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AboutTeaserComponent } from './about-teaser.component';

describe('AboutTeaserComponent', () => {
  let fixture: ComponentFixture<AboutTeaserComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const portrait = (): HTMLImageElement => root().querySelector('img') as HTMLImageElement;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AboutTeaserComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutTeaserComponent);
    await fixture.whenStable();
  });

  it('should show the portrait with a translated alt text', async () => {
    expect(portrait().getAttribute('src')).toBe('/assets/images/profile.webp');
    expect(portrait().alt).toBe('Portrait of Santi García');

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(portrait().alt).toBe('Retrato de Santi García');
  });

  it('should show the tagline in the chosen language, above the intro', async () => {
    const tagline = (): string | undefined =>
      root().querySelector('.about-teaser__tagline')?.textContent?.trim();

    expect(tagline()).toBe('I just press buttons.');
    expect(root().querySelector('.about-teaser__tagline + .about-teaser__intro')).not.toBeNull();

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(tagline()).toBe('Yo solo aprieto botones.');
  });

  it('should invite visitors to the about page', () => {
    const link = root().querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/about');
    expect(link.textContent).toContain('More about Santi');
  });
});

describe('AboutTeaserComponent with a portrait chosen in the dashboard', () => {
  const profilePhoto = signal<Photo | null>(null);
  const ready = signal(false);
  let fixture: ComponentFixture<AboutTeaserComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const portrait = (): HTMLImageElement | null => root().querySelector('img');

  beforeEach(async () => {
    profilePhoto.set(null);
    ready.set(false);

    await TestBed.configureTestingModule({
      imports: [AboutTeaserComponent, realTranslations()],
      providers: [
        provideRouter([]),
        { provide: SiteSettingsStore, useValue: { profilePhoto, ready } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutTeaserComponent);
    await fixture.whenStable();
  });

  it('should keep the frame empty, at the portrait size, until the settings are read', () => {
    expect(portrait()).toBeNull();
    expect(root().querySelector('.about-teaser__placeholder')).not.toBeNull();
  });

  it('should show the same portrait as the About page', async () => {
    profilePhoto.set({ alt: 'x', height: 900, id: 'framed-by-santi/posts/me', width: 600 });
    ready.set(true);
    await fixture.whenStable();

    expect(portrait()?.getAttribute('src')).toContain('framed-by-santi/posts/me');
    expect(portrait()?.alt).toBe('Portrait of Santi García');
  });
});
