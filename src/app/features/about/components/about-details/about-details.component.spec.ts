import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { INSTAGRAM_URL } from '@core/const/social.const';
import { LanguageStore } from '@core/store/language.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AboutDetailsComponent } from './about-details.component';

describe('AboutDetailsComponent', () => {
  let fixture: ComponentFixture<AboutDetailsComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): string[] =>
    Array.from(root().querySelectorAll('.about-details__row')).map((row) => {
      const term = row.querySelector('dt')?.textContent?.trim() ?? '';
      const value = row.querySelector('dd')?.textContent?.trim() ?? '';

      return `${term} ${value}`;
    });

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AboutDetailsComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutDetailsComponent);
    await fixture.whenStable();
  });

  it('should list the camera, the city and Instagram as a description list', () => {
    expect(root().querySelector('dl')).not.toBeNull();
    expect(rows()).toEqual(['Camera Fujifilm X100VI', 'City New York', 'Instagram @framedbysanti']);
  });

  it('should write the labels and the city in the active language', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();

    expect(rows()).toEqual([
      'Cámara Fujifilm X100VI',
      'Ciudad Nueva York',
      'Instagram @framedbysanti',
    ]);

    TestBed.inject(LanguageStore).setLang('pt');
    await fixture.whenStable();

    expect(rows()[1]).toBe('Cidade Nova Iorque');
  });

  it('should open Instagram in a new tab without leaking the opener', () => {
    const external = Array.from(root().querySelectorAll(`a[href="${INSTAGRAM_URL}"]`));

    expect(external).toHaveLength(2);
    external.forEach((link) => {
      expect((link as HTMLAnchorElement).target).toBe('_blank');
      expect((link as HTMLAnchorElement).rel).toContain('noopener');
    });
  });

  it('should invite visitors to the gallery and never expose a sign-in', () => {
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/gallery');
    expect(hrefs.join(' ')).not.toMatch(/login|admin|auth|sign/i);
  });
});
