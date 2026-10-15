import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The functions run as native ES modules on Vercel (`"type": "module"`), where a relative import
 * needs its extension: `./_translate` fails at start-up with ERR_MODULE_NOT_FOUND. Tests and the
 * type checker do not notice, so this pins it.
 */
describe('api function imports', () => {
  const sources = readdirSync(__dirname).filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.spec.ts')
  );

  it('should find the function files', () => {
    expect(sources).toEqual(
      expect.arrayContaining(['sign-upload.ts', 'translate.ts', '_admin-auth.ts'])
    );
  });

  it.each(sources)('should give every relative import in %s its .js extension', (name) => {
    const code = readFileSync(join(__dirname, name), 'utf8');
    const relative = [...code.matchAll(/from\s+'(\.[^']*)'/g)].map((match) => match[1]);

    const missing = relative.filter((path) => !path.endsWith('.js'));

    expect(missing).toEqual([]);
  });
});
