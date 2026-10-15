import { Photo } from '@features/photo-posts/models/photo.model';

import { preloadPhoto } from './preload-photo';

describe('preloadPhoto', () => {
  const photo: Photo = { alt: 'A', height: 800, id: 'post-1/01', width: 1200 };
  const created: { sizes?: string; src?: string; srcset?: string }[] = [];

  beforeEach(() => {
    created.length = 0;
    vi.stubGlobal(
      'Image',
      class {
        sizes = '';
        src = '';
        srcset = '';
        constructor() {
          created.push(this);
        }
      }
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should start downloading the very file the viewer will show, at its normal size', () => {
    preloadPhoto(photo);

    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('/local-photos/post-1/01.webp');
    expect(created[0].sizes).toBe('100vw');
  });

  it('should do nothing for a missing photo, like the one before the first or after the last', () => {
    preloadPhoto(undefined);

    expect(created).toHaveLength(0);
  });
});
