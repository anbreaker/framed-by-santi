import { DEFAULT_THEMES, themeIdFromName, toTheme } from './theme.model';

describe('DEFAULT_THEMES', () => {
  it('should keep the five original themes, each named in every language', () => {
    expect(DEFAULT_THEMES.map((theme) => theme.id)).toEqual([
      'architecture',
      'bw',
      'night',
      'sky',
      'street',
    ]);
    expect(DEFAULT_THEMES.find((theme) => theme.id === 'bw')?.label).toEqual({
      en: 'Black & white',
      es: 'Blanco y negro',
      pt: 'Preto e branco',
    });
  });
});

describe('toTheme', () => {
  const label = { en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' };

  it('should read a theme document using the document id', () => {
    expect(toTheme('sunset', { label })).toEqual({ id: 'sunset', label });
  });

  it('should reject a document without a full translated label', () => {
    expect(toTheme('x', { label: { en: 'Only English' } })).toBeNull();
    expect(toTheme('x', { label: 'Sunset' })).toBeNull();
    expect(toTheme('x', {})).toBeNull();
    expect(toTheme('x', null)).toBeNull();
  });
});

describe('themeIdFromName', () => {
  it('should build a url-safe id: lowercase, no accents, words joined by a dash', () => {
    expect(themeIdFromName('Black & White!')).toBe('black-white');
    expect(themeIdFromName('  Atardecer en Ñuñoa ')).toBe('atardecer-en-nunoa');
  });

  it('should return an empty id when nothing usable is left', () => {
    expect(themeIdFromName(' ?! ')).toBe('');
  });
});
