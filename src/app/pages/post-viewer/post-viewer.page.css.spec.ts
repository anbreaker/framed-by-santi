import { readFileSync } from 'node:fs';

describe('the stylesheet of the viewer page', () => {
  const css = readFileSync('src/app/pages/post-viewer/post-viewer.page.css', 'utf8');
  const rule = (selector: string): string =>
    css.match(new RegExp(`${selector.replace('.', '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';

  it('should center the counter and the thumbnails under the photo', () => {
    expect(rule('.viewer__bar')).toMatch(/justify-content:\s*center/);
  });

  it('should let the thumbnails shrink and scroll instead of pushing the bar off-centre', () => {
    expect(css).toMatch(/app-set-thumbnails\s*\{[^}]*min-width:\s*0/);
  });

  it('should not add vertical margin to the back link, which already has its own touch height', () => {
    expect(rule('.viewer__back')).toMatch(/margin:\s*0 var\(--gutter\)/);
  });
});
