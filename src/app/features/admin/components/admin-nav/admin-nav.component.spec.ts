import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AdminSessionStore } from '@features/auth/store/admin-session.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminNavComponent } from './admin-nav.component';

@Component({ template: '' })
class EmptyPageComponent {}

const isOwner = signal(false);

describe('AdminNavComponent', () => {
  let fixture: ComponentFixture<AdminNavComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const link = (href: string): HTMLAnchorElement =>
    root().querySelector(`a[href="${href}"]`) as HTMLAnchorElement;

  beforeEach(async () => {
    localStorage.clear();
    isOwner.set(false);
    await TestBed.configureTestingModule({
      imports: [AdminNavComponent, realTranslations()],
      providers: [
        provideRouter([
          { component: EmptyPageComponent, path: 'admin/dashboard' },
          { component: EmptyPageComponent, path: 'admin/settings' },
          { component: EmptyPageComponent, path: 'admin/congratulations' },
          { component: EmptyPageComponent, path: 'admin/congratulations/manage' },
        ]),
        { provide: AdminSessionStore, useValue: { isOwner } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminNavComponent);
  });

  it('should link the sets, the settings and the congratulations, in that order, inside a labelled navigation', async () => {
    await fixture.whenStable();

    const nav = root().querySelector('nav');
    const hrefs = Array.from(root().querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(nav?.getAttribute('aria-label')).toBe('Admin sections');
    expect(hrefs).toEqual(['/admin/dashboard', '/admin/settings', '/admin/congratulations']);
    expect(link('/admin/dashboard').textContent).toContain('Sets');
    expect(link('/admin/settings').textContent).toContain('Settings');
    expect(link('/admin/congratulations').textContent).toContain('Congratulations');
  });

  it('should mark the section that is open as the current page', async () => {
    await TestBed.inject(Router).navigateByUrl('/admin/settings');
    await fixture.whenStable();

    expect(link('/admin/settings').getAttribute('aria-current')).toBe('page');
    expect(link('/admin/dashboard').getAttribute('aria-current')).toBeNull();
  });

  it('should add the link to manage the congratulations only for the owner', async () => {
    await fixture.whenStable();
    expect(link('/admin/congratulations/manage')).toBeNull();

    isOwner.set(true);
    await fixture.whenStable();
    expect(link('/admin/congratulations/manage').textContent).toContain('Manage congratulations');
  });

  it('should mark only the manage link as current while managing', async () => {
    isOwner.set(true);
    await TestBed.inject(Router).navigateByUrl('/admin/congratulations/manage');
    await fixture.whenStable();

    expect(link('/admin/congratulations/manage').getAttribute('aria-current')).toBe('page');
    expect(link('/admin/congratulations').getAttribute('aria-current')).toBeNull();
  });
});
