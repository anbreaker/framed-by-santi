import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LANG_STORAGE_KEY } from '@core/const/lang.const';

import { LangSelectorComponent } from './lang-selector.component';

describe('LangSelectorComponent', () => {
  let fixture: ComponentFixture<LangSelectorComponent>;

  const buttons = (): HTMLButtonElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');

    await TestBed.configureTestingModule({
      imports: [
        LangSelectorComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: { langSelector: { label: 'Language' } },
            es: { langSelector: { label: 'Idioma' } },
            pt: { langSelector: { label: 'Idioma' } },
          },
          translocoConfig: { availableLangs: ['en', 'es', 'pt'], defaultLang: 'en' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LangSelectorComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render one button per supported language', () => {
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['EN', 'ES', 'PT']);
  });

  it('should mark the active language as pressed', () => {
    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('should switch and persist the language when a button is clicked', async () => {
    buttons()[2].click();
    await fixture.whenStable();

    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
    ]);
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('pt');
  });
});
