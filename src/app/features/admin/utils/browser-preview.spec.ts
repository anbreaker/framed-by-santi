import { makePreview, PREVIEW_WIDTH } from './browser-preview';

describe('makePreview', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('should decode the file already shrunk and return the address of a small JPEG', async () => {
    const close = vi.fn();
    const createImageBitmap = vi.fn().mockResolvedValue({ close, height: 533, width: 800 });
    const drawImage = vi.fn();
    const convertToBlob = vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    class FakeCanvas {
      constructor(
        readonly width: number,
        readonly height: number
      ) {}
      convertToBlob = convertToBlob;
      getContext = (): { drawImage: typeof drawImage } => ({ drawImage });
    }
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    URL.createObjectURL = vi.fn(() => 'blob:small');
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

    const url = await makePreview(file);

    expect(url).toBe('blob:small');
    expect(createImageBitmap).toHaveBeenCalledWith(file, {
      resizeQuality: 'low',
      resizeWidth: PREVIEW_WIDTH,
    });
    expect(drawImage).toHaveBeenCalled();
    expect(convertToBlob).toHaveBeenCalledWith({ quality: 0.7, type: 'image/jpeg' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('should release the decoded image even when drawing it fails', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close, height: 1, width: 1 }));
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext = (): null => null;
      }
    );

    await expect(makePreview(new File(['x'], 'a.jpg'))).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
