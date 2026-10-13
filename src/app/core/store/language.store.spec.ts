import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { LANG_STORAGE_KEY } from '@core/const/lang.const';

import { LanguageStore } from './language.store';

describe('LanguageStore', () => {
  const setActiveLang = vi.fn();

  const createStore = (): LanguageStore => {
    TestBed.configureTestingModule({
      providers: [{ provide: TranslocoService, useValue: { setActiveLang } }],
    });

    return TestBed.inject(LanguageStore);
  };

  const mockBrowserLang = (language: string): void => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
  };

  beforeEach(() => {
    localStorage.clear();
    setActiveLang.mockClear();
    document.documentElement.lang = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should default to English when nothing is stored and the browser language is unsupported', () => {
    mockBrowserLang('fr-FR');

    const store = createStore();

    expect(store.currentLang()).toBe('en');
    expect(setActiveLang).toHaveBeenCalledWith('en');
  });

  it('should use the browser language when it is supported', () => {
    mockBrowserLang('pt-PT');

    expect(createStore().currentLang()).toBe('pt');
  });

  it('should prefer the stored language over the browser language', () => {
    mockBrowserLang('pt-PT');
    localStorage.setItem(LANG_STORAGE_KEY, 'es');

    expect(createStore().currentLang()).toBe('es');
  });

  it('should ignore an unsupported stored language', () => {
    mockBrowserLang('fr-FR');
    localStorage.setItem(LANG_STORAGE_KEY, 'de');

    expect(createStore().currentLang()).toBe('en');
  });

  it('should update the signal, Transloco, the html lang and storage on setLang', () => {
    mockBrowserLang('fr-FR');
    const store = createStore();

    store.setLang('es');

    expect(store.currentLang()).toBe('es');
    expect(setActiveLang).toHaveBeenLastCalledWith('es');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('es');
  });

  it('should keep working when storage is unavailable', () => {
    mockBrowserLang('fr-FR');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const store = createStore();

    expect(() => store.setLang('pt')).not.toThrow();
    expect(store.currentLang()).toBe('pt');
  });
});
