import {
  fitLongEdge,
  ImageCodec,
  MAX_UPLOAD_BYTES,
  PhotoRejectedError,
  preparePhoto,
} from './prepare-photo';

const file = (size: number, type = 'image/jpeg'): File => {
  const source = new File([new Uint8Array(1)], 'p.jpg', { type });
  Object.defineProperty(source, 'size', { value: size });
  return source;
};

const encoded = (size: number): Blob => {
  const blob = new Blob(['x'], { type: 'image/jpeg' });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
};

const codec = (width: number, height: number, encodedSizes: number[] = [1000]) => {
  const sizes = [...encodedSizes];
  return {
    decode: vi.fn().mockResolvedValue({ height, source: {}, width }),
    encode: vi.fn(async () => encoded(sizes.shift() ?? 1000)),
  } satisfies ImageCodec;
};

describe('fitLongEdge', () => {
  it('should keep the size when the long edge fits', () => {
    expect(fitLongEdge(4000, 3000, 6000)).toEqual({ height: 3000, width: 4000 });
  });

  it('should scale the long edge down to the limit keeping the ratio', () => {
    expect(fitLongEdge(8000, 6000, 6000)).toEqual({ height: 4500, width: 6000 });
    expect(fitLongEdge(3000, 9000, 6000)).toEqual({ height: 6000, width: 2000 });
  });
});

describe('preparePhoto', () => {
  it('should upload a photo that already fits as it is, without re-encoding it', async () => {
    const source = file(2_000_000);
    const images = codec(5000, 3333);

    const result = await preparePhoto(source, images);

    expect(result).toEqual({ blob: source, height: 3333, warnings: [], width: 5000 });
    expect(images.encode).not.toHaveBeenCalled();
  });

  it('should resize a photo above 6000 px on the long edge and say so', async () => {
    const images = codec(8000, 6000);

    const result = await preparePhoto(file(4_000_000), images);

    expect(images.encode).toHaveBeenCalledWith(expect.anything(), 6000, 4500, expect.any(Number));
    expect(result.width).toBe(6000);
    expect(result.height).toBe(4500);
    expect(result.warnings).toEqual([{ kind: 'resized', maxLongEdge: 6000 }]);
  });

  it('should lower the quality of a photo above 10 MB until it fits and say so', async () => {
    const images = codec(5000, 3333, [MAX_UPLOAD_BYTES + 1, 9_000_000]);

    const result = await preparePhoto(file(MAX_UPLOAD_BYTES + 5_000_000), images);

    expect(images.encode).toHaveBeenCalledTimes(2);
    const [first, second] = images.encode.mock.calls.map((call) => call[3] as number);
    expect(second).toBeLessThan(first);
    expect(result.warnings).toEqual([{ kind: 'recompressed', maxMegabytes: 10 }]);
  });

  it('should report both warnings when a photo is resized and still too heavy at first', async () => {
    const images = codec(9000, 6000, [MAX_UPLOAD_BYTES + 1, 1000]);

    const result = await preparePhoto(file(30_000_000), images);

    expect(result.warnings.map((warning) => warning.kind)).toEqual(['resized', 'recompressed']);
  });

  it('should reject a photo that stays above 10 MB at the lowest quality', async () => {
    const images = codec(5000, 3333, Array(10).fill(MAX_UPLOAD_BYTES + 1));

    await expect(preparePhoto(file(MAX_UPLOAD_BYTES + 1), images)).rejects.toMatchObject({
      reason: 'too-large',
    });
  });

  it('should reject unsupported file types before decoding', async () => {
    const images = codec(100, 100);

    await expect(preparePhoto(file(1000, 'image/heic'), images)).rejects.toBeInstanceOf(
      PhotoRejectedError
    );
    await expect(preparePhoto(file(1000, 'application/pdf'), images)).rejects.toMatchObject({
      reason: 'unsupported-type',
    });
    expect(images.decode).not.toHaveBeenCalled();
  });

  it('should reject a file that cannot be decoded as an image', async () => {
    const images = { decode: vi.fn().mockRejectedValue(new Error('bad')), encode: vi.fn() };

    await expect(preparePhoto(file(1000), images)).rejects.toMatchObject({ reason: 'unreadable' });
  });
});
