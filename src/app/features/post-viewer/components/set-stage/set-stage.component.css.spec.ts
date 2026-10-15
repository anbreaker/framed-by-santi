import { readFileSync } from 'node:fs';

describe('the stylesheet of the stage', () => {
  const css = readFileSync(
    'src/app/features/post-viewer/components/set-stage/set-stage.component.css',
    'utf8'
  );

  it('should clip the frame, so a photo sliding in or out never shows a horizontal scrollbar', () => {
    const frame = css.match(/\.set-stage__frame \{([^}]*)\}/)?.[1] ?? '';

    expect(frame).toMatch(/overflow:\s*hidden/);
  });
});
