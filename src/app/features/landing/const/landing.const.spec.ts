import { readFileSync } from 'node:fs';

import { LANDING_HERO_SOURCE } from './landing.const';

describe('the hero photo preload in index.html', () => {
  const html = readFileSync('src/index.html', 'utf8');

  it('should preload the very file the hero shows, with high priority', () => {
    expect(html).toContain(LANDING_HERO_SOURCE);
    expect(html).toMatch(/hero\.rel = 'preload'/);
    expect(html).toMatch(/fetchpriority/);
  });

  it('should only preload it on the home page, so other pages do not download it for nothing', () => {
    expect(html).toMatch(/location\.pathname === '\/'/);
  });
});
