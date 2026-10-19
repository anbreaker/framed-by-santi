import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SiteSettingsStore } from '@features/site-settings/store/site-settings.store';
import { realTranslations } from '@shared/testing/transloco-testing';

import { AdminSettingsPageComponent } from './admin-settings.page';

describe('AdminSettingsPageComponent', () => {
  let fixture: ComponentFixture<AdminSettingsPageComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminSettingsPageComponent, realTranslations()],
      providers: [
        provideRouter([]),
        {
          provide: SiteSettingsStore,
          useValue: { profilePhoto: signal(null), ready: signal(true), setProfilePhoto: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettingsPageComponent);
    await fixture.whenStable();
  });

  it('should be its own page, with the admin navigation, a heading and the profile photo setting', () => {
    expect(root().querySelector('main#main-content')).not.toBeNull();
    expect(root().querySelector('app-admin-shell app-admin-nav')).not.toBeNull();
    expect(root().querySelector('h1')?.textContent).toContain('Settings');
    expect(root().querySelector('app-profile-photo-setting')).not.toBeNull();
  });

  it('should keep search engines away, like the other admin pages', () => {
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });
});
