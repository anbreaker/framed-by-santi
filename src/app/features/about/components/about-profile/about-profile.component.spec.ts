import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageStore } from '@core/store/language.store';
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
