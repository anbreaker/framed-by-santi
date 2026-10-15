import { fillMissingLanguages, PostTexts, toLanguageTexts } from './fill-languages';

const texts = (caption: PostTexts['caption'], description?: PostTexts['description']): PostTexts => ({
  caption,
  description: description ?? { en: '', es: '', pt: '' },
});

describe('fillMissingLanguages', () => {
  const translate = vi.fn();

  beforeEach(() => {
    translate.mockReset();
    translate.mockImplementation(async (_source: string, items: readonly string[]) => ({
      en: items.map((item) => item),
      es: items.map((item) => `${item} ES`),
      pt: items.map((item) => `${item} PT`),
    }));
  });

  it('should translate only the languages left blank and keep what was written', async () => {
    const result = await fillMissingLanguages(
      texts({ en: 'Hello October', es: 'Hola a mano', pt: '' }),
      translate
    );

    expect(result.caption).toEqual({
      en: 'Hello October',
      es: 'Hola a mano',
      pt: 'Hello October PT',
    });
    expect(translate).toHaveBeenCalledWith('auto', ['Hello October']);
  });

  it('should return the very same texts, without calling the service, when nothing is blank', async () => {
    const complete = texts({ en: 'A', es: 'B', pt: 'C' });

    expect(await fillMissingLanguages(complete, translate)).toBe(complete);
    expect(translate).not.toHaveBeenCalled();
  });

  it('should translate nothing for a field that has no text in any language', async () => {
    const result = await fillMissingLanguages(texts({ en: 'Only caption', es: '', pt: '' }), translate);

    expect(translate).toHaveBeenCalledWith('auto', ['Only caption']);
    expect(result.description).toEqual({ en: '', es: '', pt: '' });
  });

  it('should start from the preferred language when it has text', async () => {
    await fillMissingLanguages(texts({ en: 'English', es: 'Español', pt: '' }), translate, 'es');

    expect(translate).toHaveBeenCalledWith('auto', ['Español']);
  });

  it('should let the failure through so the caller decides what to do', async () => {
    translate.mockRejectedValue(new Error('down'));

    await expect(
      fillMissingLanguages(texts({ en: 'Hello', es: '', pt: '' }), translate)
    ).rejects.toThrow('down');
  });
});

describe('toLanguageTexts', () => {
  it('should put a text from before translations in English', () => {
    expect(toLanguageTexts('Old')).toEqual({ en: 'Old', es: '', pt: '' });
    expect(toLanguageTexts(undefined)).toEqual({ en: '', es: '', pt: '' });
  });
});
