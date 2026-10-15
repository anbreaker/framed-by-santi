import { DEFAULT_THEMES, themeIdFor, themeIdFromName, toTheme } from './theme.model';

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

  it('should reject a label that has no text in any language', () => {
    expect(toTheme('x', { label: { en: ' ', es: '', pt: '  ' } })).toBeNull();
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

describe('themeIdFor', () => {
  it('should use the first language that gives a usable id, English first', () => {
    expect(themeIdFor({ en: 'Sunset', es: 'Atardecer', pt: 'Pôr do sol' })).toBe('sunset');
    expect(themeIdFor({ en: '夜', es: 'Noche', pt: 'Noite' })).toBe('noche');
  });

  it('should give a stable id of its own when no language has Latin letters', () => {
    const label = { en: '夜', es: '夜', pt: '夜' };

    expect(themeIdFor(label)).toMatch(/^theme-[0-9a-f]{8}$/);
    expect(themeIdFor(label)).toBe(themeIdFor({ ...label }));
    expect(themeIdFor({ en: '昼', es: '昼', pt: '昼' })).not.toBe(themeIdFor(label));
  });

  it('should give no id when there is no letter or digit at all', () => {
    expect(themeIdFor({ en: '🔥', es: '?!', pt: ' ' })).toBe('');
    expect(themeIdFor({ en: '', es: '', pt: '' })).toBe('');
  });
});
