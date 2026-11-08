import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Rewrite {
  destination: string;
  source: string;
}

interface VercelConfig {
  framework?: string;
  rewrites: Rewrite[];
}

/**
 * Vercel serves files that exist first and only then applies the rewrites. A path with an extension
 * that has no file, such as /.well-known/ai-catalog.json, must answer 404 instead of the app's HTML,
 * or agents and Lighthouse read the page as a broken file.
 */
describe('vercel.json', () => {
  const config = JSON.parse(
    readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')
  ) as VercelConfig;
  const appRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');
  const sendsToApp = (path: string): boolean =>
    new RegExp(`^${appRewrite?.source ?? '$^'}$`).test(path);

  it('should build as a plain Vite app, so the Angular preset adds no catch-all of its own', () => {
    expect(config.framework).toBe('vite');
  });

  it.each(['/', '/gallery', '/gallery/abc123', '/about', '/admin/congratulations/manage', '/nope'])(
    'should send the app route %s to the app',
    (path) => {
      expect(sendsToApp(path)).toBe(true);
    }
  );

  it.each([
    '/llms.txt',
    '/.well-known/ai-catalog.json',
    '/missing.js',
    '/assets/i18n/xx.json',
    '/api/sign-upload',
  ])('should leave %s to its file or function, answering 404 when there is none', (path) => {
    expect(sendsToApp(path)).toBe(false);
  });

  it('should keep the functions reachable under /api', () => {
    expect(config.rewrites).toContainEqual({ destination: '/api/$1', source: '/api/(.*)' });
  });
});
