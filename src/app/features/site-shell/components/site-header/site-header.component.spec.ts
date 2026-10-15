import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const menuButton = (): HTMLButtonElement =>
    root().querySelector('.site-header__menu-button') as HTMLButtonElement;
  const panel = (): HTMLElement => root().querySelector('#site-menu') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SiteHeaderComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              langSelector: { label: 'Language' },
              nav: {
                about: 'About',
                ariaLabel: 'Main',
                closeMenu: 'Close menu',
                gallery: 'Gallery',
                home: 'Framed by Santi, home',
                menu: 'Menu',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
    await fixture.whenStable();
  });

  it('should link the brand home and the two public sections', () => {
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/', '/gallery', '/about']);
  });

  it('should never expose a sign-in link to visitors', () => {
    const text = root().textContent?.toLowerCase() ?? '';
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.href);

    expect(text).not.toMatch(/sign.?in|log.?in|admin/);
    expect(hrefs.join(' ')).not.toMatch(/login|admin|auth/);
  });

  it('should keep the menu closed until the menu button is pressed', async () => {
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(panel().classList.contains('site-header__panel--open')).toBe(false);

    menuButton().click();
    await fixture.whenStable();

    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(menuButton().getAttribute('aria-label')).toBe('Close menu');
    expect(panel().classList.contains('site-header__panel--open')).toBe(true);
  });

  it('should close the open menu with the Escape key', async () => {
    menuButton().click();
    await fixture.whenStable();

    root().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await fixture.whenStable();

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('should include the language selector inside the menu panel', () => {
    expect(panel().querySelector('app-lang-selector')).not.toBeNull();
  });

  it('should wrap each link label so the hover underline hugs the text', () => {
    const labels = Array.from(root().querySelectorAll('a > .link-grow')).map((label) =>
      label.textContent?.trim()
    );

    expect(labels).toEqual(['Framed by Santi', 'Gallery', 'About']);
  });
});
