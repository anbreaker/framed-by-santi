import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { realTranslations } from '@shared/testing/transloco-testing';

import { AboutPageComponent } from './about.page';

describe('AboutPageComponent', () => {
  it('should compose the profile and the details inside the main landmark', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AboutPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AboutPageComponent);
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;

    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.querySelector('app-about-profile')).not.toBeNull();
    expect(main.querySelector('app-about-details')).not.toBeNull();
    expect(main.querySelectorAll('h1')).toHaveLength(1);
  });
});
