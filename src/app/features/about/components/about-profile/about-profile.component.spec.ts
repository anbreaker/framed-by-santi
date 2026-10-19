import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageStore } from '@core/store/language.store';
import { Photo } from '@features/photo-posts/models/photo.model';
import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AboutProfileComponent } from './about-profile.component';

describe('AboutProfileComponent', () => {
  let fixture: ComponentFixture<AboutProfileComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const portrait = (): HTMLImageElement => root().querySelector('img') as HTMLImageElement;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AboutProfileComponent, realTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutProfileComponent);
    await fixture.whenStable();
  });

  it('should be the page heading with the name, the tagline and a few words', () => {
    expect(root().querySelector('h1')?.textContent).toBe('Santi García');
    expect(root().textContent).toContain('I just press buttons.');
    expect(root().textContent).toContain('camera always on');
  });

  it('should show the portrait as the first image on the page, with a translated alt text', async () => {
    expect(portrait().getAttribute('src')).toBe('/assets/images/profile.webp');
    expect(portrait().getAttribute('loading')).toBe('eager');
    expect(portrait().alt).toBe('Portrait of Santi García');

    TestBed.inject(LanguageStore).setLang('pt');
    await fixture.whenStable();

    expect(portrait().alt).toBe('Retrato de Santi García');
    expect(root().textContent).toContain('Eu só carrego nos botões.');
  });
});

describe('AboutProfileComponent with a portrait chosen in the dashboard', () => {
  const profilePhoto = signal<Photo | null>(null);
  const ready = signal(false);
  let fixture: ComponentFixture<AboutProfileComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const portrait = (): HTMLImageElement | null => root().querySelector('img');

  beforeEach(async () => {
    profilePhoto.set(null);
    ready.set(false);

    await TestBed.configureTestingModule({
      imports: [AboutProfileComponent, realTranslations()],
      providers: [{ provide: SiteSettingsStore, useValue: { profilePhoto, ready } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutProfileComponent);
    await fixture.whenStable();
  });

  it('should keep the frame empty, at the portrait size, until the settings are read', () => {
    expect(portrait()).toBeNull();
    expect(root().querySelector('.about-profile__placeholder')).not.toBeNull();
  });

  it('should show the chosen portrait, with the translated alt text', async () => {
    profilePhoto.set({ alt: 'x', height: 900, id: 'framed-by-santi/posts/me', width: 600 });
    ready.set(true);
    await fixture.whenStable();

    expect(portrait()?.getAttribute('src')).toContain('framed-by-santi/posts/me');
    expect(portrait()?.getAttribute('height')).toBe('900');
    expect(portrait()?.alt).toBe('Portrait of Santi García');
    expect(root().querySelector('.about-profile__placeholder')).toBeNull();
  });

  it('should show the portrait that ships with the site when none was chosen', async () => {
    ready.set(true);
    await fixture.whenStable();

    expect(portrait()?.getAttribute('src')).toBe('/assets/images/profile.webp');
  });
});
