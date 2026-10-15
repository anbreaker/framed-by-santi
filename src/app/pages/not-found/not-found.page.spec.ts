import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { realTranslations } from '@shared/testing/transloco-testing';

import { routes } from '../../app.routes';
import { NotFoundPageComponent } from './not-found.page';

describe('NotFoundPageComponent', () => {
  let fixture: ComponentFixture<NotFoundPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const robots = (): string | null =>
    document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent, realTranslations()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundPageComponent);
    await fixture.whenStable();
  });

  it('should say the page is not there, in the site language', () => {
    expect(root().querySelector('h1')?.textContent).toContain('Out of frame');
    expect(root().textContent).toContain('404');
  });

  it('should offer the way back: the home page as the main action and the gallery', () => {
    const links = Array.from(root().querySelectorAll('a.btn')) as HTMLAnchorElement[];

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/gallery']);
    expect(links[0].classList).toContain('btn--primary');
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Back to home',
      'See the gallery',
    ]);
  });

  it('should keep search engines out while it is open, and let go of it afterwards', () => {
    expect(robots()).toBe('noindex, nofollow');

    fixture.destroy();

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('should be what an unknown address shows, instead of silently going to the home page', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [realTranslations()],
      providers: [provideRouter(routes), Meta],
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/this-page-does-not-exist');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Out of frame');
    expect(TestBed.inject(Meta).getTag('name="robots"')).not.toBeNull();
  });
});
