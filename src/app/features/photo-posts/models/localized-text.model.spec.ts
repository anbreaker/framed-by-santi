import { isLocalizedText, localize, parseText } from './localized-text.model';

const text = { en: 'Cyclist', es: 'Ciclista', pt: 'Ciclista PT' };

describe('localize', () => {
  it('should return a plain text unchanged in every language', () => {
    expect(localize('Cyclist', 'es')).toBe('Cyclist');
  });

  it('should pick the active language', () => {
    expect(localize(text, 'es')).toBe('Ciclista');
    expect(localize(text, 'pt')).toBe('Ciclista PT');
  });

  it('should fall back to English, then Spanish, then Portuguese when the language is empty', () => {
    expect(localize({ en: 'E', es: '', pt: '' }, 'pt')).toBe('E');
    expect(localize({ en: '', es: 'S', pt: '' }, 'pt')).toBe('S');
    expect(localize({ en: '', es: '', pt: 'P' }, 'es')).toBe('P');
  });
});

describe('isLocalizedText', () => {
  it('should accept an object with all three languages as text', () => {
    expect(isLocalizedText(text)).toBe(true);
    expect(isLocalizedText({ en: 'x' })).toBe(false);
    expect(isLocalizedText('x')).toBe(false);
    expect(isLocalizedText({ en: 'a', es: 'b', pt: 3 })).toBe(false);
  });
});

describe('parseText', () => {
  it('should read a plain string or a full localized object and reject the rest', () => {
    expect(parseText('Cyclist')).toBe('Cyclist');
    expect(parseText(text)).toEqual(text);
    expect(parseText(3)).toBeNull();
    expect(parseText({ en: 'x' })).toBeNull();
    expect(parseText(undefined)).toBeNull();
  });
});
