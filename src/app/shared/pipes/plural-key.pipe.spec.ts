import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SUPPORTED_LANGS } from '@core/const/lang.const';

import { PluralKeyPipe } from './plural-key.pipe';

type Translations = { gallery: { photoCount: Record<string, string> } };

describe('PluralKeyPipe', () => {
  const pipe = new PluralKeyPipe();

  it('should select the singular key for one and the plural key for any other count', () => {
    SUPPORTED_LANGS.forEach((lang) => {
      expect(pipe.transform(1, 'gallery.photoCount', lang)).toBe('gallery.photoCount.one');
      expect(pipe.transform(0, 'gallery.photoCount', lang)).toBe('gallery.photoCount.other');
      expect(pipe.transform(10, 'gallery.photoCount', lang)).toBe('gallery.photoCount.other');
    });
  });

  it('should only produce keys that exist in every translation file', () => {
    SUPPORTED_LANGS.forEach((lang) => {
      const translations = JSON.parse(
        readFileSync(resolve(process.cwd(), `public/assets/i18n/${lang}.json`), 'utf-8')
      ) as Translations;

      [0, 1, 2, 1_000_000].forEach((count) => {
        const key = pipe.transform(count, 'gallery.photoCount', lang).split('.').pop() ?? '';
        expect(translations.gallery.photoCount[key]).toBeTruthy();
      });
    });
  });
});
