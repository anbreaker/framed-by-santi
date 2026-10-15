import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { common: { skipToContent: 'Skip to content' } } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the header, the router outlet and, once a page is in, the footer', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-site-header')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-site-footer')).not.toBeNull();
  });

  it('should keep the footer out until the first page is rendered, so it does not jump down when it arrives', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    expect(compiled.querySelector('app-site-footer')).toBeNull();

    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();

    expect(compiled.querySelector('app-site-footer')).not.toBeNull();
  });

  it('should move focus to the main content without navigating when using the skip link', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    document.body.appendChild(main);

    const skipLink = (fixture.nativeElement as HTMLElement).querySelector(
      '.skip-link'
    ) as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    skipLink.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(main);
    main.remove();
  });
});
