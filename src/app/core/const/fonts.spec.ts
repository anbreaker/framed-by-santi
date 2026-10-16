import { existsSync, readFileSync, statSync } from 'node:fs';

const read = (path: string): string => readFileSync(path, 'utf8');

describe('self-hosted fonts', () => {
  const html = read('src/index.html');
  const css = read('src/styles/base/fonts.css');
  const tokens = read('src/styles/base/tokens.css');

  it('should not depend on Google Fonts or any other font CDN', () => {
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(css).not.toMatch(/https?:\/\//);
  });

  it('should declare every family the design tokens ask for, and show text while they load', () => {
    const families = [...tokens.matchAll(/--font-(?:body|display):\s*'([^']+)'/g)].map((m) => m[1]);

    expect(families.sort()).toEqual(['Hanken Grotesk', 'Instrument Serif']);
    families.forEach((family) => expect(css).toContain(`font-family: '${family}'`));
    expect(css.match(/font-display:\s*swap/g)?.length).toBe(css.match(/@font-face/g)?.length);
  });

  it('should point every face at a font file that ships with the site', () => {
    const urls = [...css.matchAll(/url\('(\/[^']+\.woff2)'\)/g)].map((match) => match[1]);

    expect(urls.length).toBeGreaterThanOrEqual(3);
    urls.forEach((url) => {
      const file = `public${url}`;
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file).subarray(0, 4).toString(), file).toBe('wOF2');
      expect(statSync(file).size, file).toBeLessThan(60 * 1024);
    });
  });

  it('should preload the fonts the first screen needs, from the site itself', () => {
    const preloads = [...html.matchAll(/<link[^>]*>/g)]
      .map((match) => match[0])
      .filter((link) => link.includes('rel="preload"') && link.includes('as="font"'));

    expect(preloads.length).toBeGreaterThanOrEqual(2);
    preloads.forEach((link) => {
      expect(link).toMatch(/href="\/assets\/fonts\//);
      expect(link).toMatch(/type="font\/woff2"/);
      expect(link).toMatch(/crossorigin/);
    });
  });
});
