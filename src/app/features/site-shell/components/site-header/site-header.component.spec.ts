import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { AuthStore } from '@features/auth/store/auth.store';

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

  it('should morph the same two bars into a cross instead of swapping the icon', async () => {
    const bars = (): number => menuButton().querySelectorAll('.site-header__menu-bar').length;
    const isCross = (): boolean =>
      menuButton().classList.contains('site-header__menu-button--open');

    expect(bars()).toBe(2);
    expect(isCross()).toBe(false);

    menuButton().click();
    await fixture.whenStable();

    expect(bars()).toBe(2);
    expect(isCross()).toBe(true);

    menuButton().click();
    await fixture.whenStable();

    expect(bars()).toBe(2);
    expect(isCross()).toBe(false);
  });

  it('should keep the closed panel in the DOM so it can animate in', () => {
    expect(panel()).not.toBeNull();
    expect(panel().classList.contains('site-header__panel--open')).toBe(false);
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

describe('SiteHeaderComponent sign out', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let signOut: ReturnType<typeof vi.fn>;
  const isAdmin = signal(false);

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const signOutButton = (): HTMLButtonElement | null =>
    root().querySelector('.site-header__signout');

  beforeEach(async () => {
    signOut = vi.fn().mockResolvedValue(undefined);
    isAdmin.set(false);

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
                panel: 'Dashboard',
                signOut: 'Sign out',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([{ children: [], path: 'admin/dashboard' }]),
        { provide: AuthStore, useValue: { isAdmin, signOut } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
    await fixture.whenStable();
  });

  it('should not show a sign out button to visitors', () => {
    expect(signOutButton()).toBeNull();
  });

  it('should link the admin to the dashboard, before the sign out button, and nobody else', async () => {
    const panel = (): HTMLAnchorElement | null =>
      root().querySelector('a[href="/admin/dashboard"]');
    expect(panel()).toBeNull();

    isAdmin.set(true);
    await fixture.whenStable();

    expect(panel()?.textContent).toContain('Dashboard');
    const nav = Array.from(root().querySelectorAll('.site-header__nav > *'));
    expect(nav.indexOf(panel() as Element)).toBeLessThan(nav.indexOf(signOutButton() as Element));

    isAdmin.set(false);
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('should close the menu when the dashboard link is used, like the other links', async () => {
    isAdmin.set(true);
    await fixture.whenStable();
    (root().querySelector('.site-header__menu-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root().querySelector('#site-menu')?.classList).toContain('site-header__panel--open');

    (root().querySelector('a[href="/admin/dashboard"]') as HTMLAnchorElement).click();
    await fixture.whenStable();

    expect(root().querySelector('#site-menu')?.classList).not.toContain('site-header__panel--open');
  });

  it('should show it only while an admin is signed in', async () => {
    isAdmin.set(true);
    await fixture.whenStable();

    expect(signOutButton()?.textContent).toContain('Sign out');

    isAdmin.set(false);
    await fixture.whenStable();

    expect(signOutButton()).toBeNull();
  });

  it('should sign out and go back to the public site', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    isAdmin.set(true);
    await fixture.whenStable();

    signOutButton()?.click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
