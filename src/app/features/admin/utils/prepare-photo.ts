/** Long edge limit: 24 MP at 3:2, under the 25 MP of Cloudinary Free. */
export const MAX_LONG_EDGE = 6000;

/** Cloudinary Free rejects image files above 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** JPEG qualities tried in order until the file fits the size limit. */
const QUALITIES = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.4, 0.32, 0.25] as const;

export type PhotoWarning =
  { kind: 'recompressed'; maxMegabytes: number } | { kind: 'resized'; maxLongEdge: number };

export type PhotoRejection = 'too-large' | 'unreadable' | 'unsupported-type';

export class PhotoRejectedError extends Error {
  constructor(readonly reason: PhotoRejection) {
    super(reason);
    this.name = 'PhotoRejectedError';
  }
}

export interface DecodedImage {
  height: number;
  source: unknown;
  width: number;
}

/** Browser image work behind an interface so the rules can be tested without a canvas. */
export interface ImageCodec {
  decode(file: Blob): Promise<DecodedImage>;
  encode(source: unknown, width: number, height: number, quality: number): Promise<Blob>;
}

export interface PreparedPhoto {
  blob: Blob;
  height: number;
  warnings: PhotoWarning[];
  width: number;
}

/** Scales the size down so the long edge is at most `maxLongEdge`, keeping the ratio. */
export function fitLongEdge(
  width: number,
  height: number,
  maxLongEdge: number
): { height: number; width: number } {
  const longEdge = Math.max(width, height);

  if (longEdge <= maxLongEdge) return { height, width };

  const scale = maxLongEdge / longEdge;
  return { height: Math.round(height * scale), width: Math.round(width * scale) };
}

/**
 * Applies the dashboard upload rules: long edge at most 6000 px and file at most 10 MB.
 * A photo that already fits is uploaded untouched; otherwise it is resized and/or re-encoded
 * and the caller gets a warning for each thing that changed.
 */
export async function preparePhoto(file: Blob, codec: ImageCodec): Promise<PreparedPhoto> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new PhotoRejectedError('unsupported-type');

  let image: DecodedImage;
  try {
    image = await codec.decode(file);
  } catch {
    throw new PhotoRejectedError('unreadable');
  }

  const target = fitLongEdge(image.width, image.height, MAX_LONG_EDGE);
  const resized = target.width !== image.width || target.height !== image.height;

  if (!resized && file.size <= MAX_UPLOAD_BYTES) {
    return { blob: file, height: image.height, warnings: [], width: image.width };
  }

  const warnings: PhotoWarning[] = resized ? [{ kind: 'resized', maxLongEdge: MAX_LONG_EDGE }] : [];

  for (const [attempt, quality] of QUALITIES.entries()) {
    const blob = await codec.encode(image.source, target.width, target.height, quality);

    if (blob.size <= MAX_UPLOAD_BYTES) {
      if (attempt > 0 || !resized) {
        warnings.push({ kind: 'recompressed', maxMegabytes: MAX_UPLOAD_BYTES / (1024 * 1024) });
      }
      return { blob, height: target.height, warnings, width: target.width };
    }
  }

  throw new PhotoRejectedError('too-large');
}
