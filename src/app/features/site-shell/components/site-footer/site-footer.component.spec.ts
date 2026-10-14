import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { INSTAGRAM_URL } from '@core/const/social.const';

import { SiteFooterComponent } from './site-footer.component';

describe('SiteFooterComponent', () => {
  let fixture: ComponentFixture<SiteFooterComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SiteFooterComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              footer: {
                about: 'About',
                copyright: '© {{year}} Santi García · New York',
                instagram: 'Instagram',
              },
              nav: { ariaLabel: 'Main' },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteFooterComponent);
    await fixture.whenStable();
  });

  it('should show the copyright with the current year', () => {
    const year = new Date().getFullYear();

    expect(root().textContent).toContain(`© ${year} Santi García · New York`);
  });

  it('should open Instagram in a new tab without leaking the opener', () => {
    const instagram = root().querySelector(`a[href="${INSTAGRAM_URL}"]`) as HTMLAnchorElement;

    expect(instagram.target).toBe('_blank');
    expect(instagram.rel).toContain('noopener');
  });

  it('should never expose a sign-in link to visitors', () => {
    const hrefs = Array.from(root().querySelectorAll('a')).map((link) => link.href);

    expect(root().textContent?.toLowerCase()).not.toMatch(/sign.?in|log.?in|admin/);
    expect(hrefs.join(' ')).not.toMatch(/login|admin|auth/);
  });

  it('should wrap each link label so the hover underline hugs the text', () => {
    const labels = Array.from(root().querySelectorAll('a > .link-grow')).map((label) =>
      label.textContent?.trim()
    );

    expect(labels).toEqual(['Instagram ↗', 'About']);
  });
});
