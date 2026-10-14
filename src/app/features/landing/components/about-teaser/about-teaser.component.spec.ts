import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageStore } from '@core/store/language.store';
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
    expect(portrait().getAttribute('src')).toBe('/local-photos/profile.webp');
    expect(portrait().alt).toBe('Portrait of Santi García');

    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(portrait().alt).toBe('Retrato de Santi García');
  });

  it('should invite visitors to the about page', () => {
    const link = root().querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/about');
    expect(link.textContent).toContain('More about Santi');
  });
});
