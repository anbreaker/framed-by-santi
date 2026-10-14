import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { realTranslations } from '@shared/testing/transloco-testing';

import { HomePageComponent } from './home.page';

describe('HomePageComponent', () => {
  it('should compose the hero, the latest set and the about teaser inside the main landmark', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomePageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;

    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.querySelector('app-landing-hero')).not.toBeNull();
    expect(main.querySelector('app-latest-set')).not.toBeNull();
    expect(main.querySelector('app-about-teaser')).not.toBeNull();
  });
});
