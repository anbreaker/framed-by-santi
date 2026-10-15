import { DecodedImage, ImageCodec } from './prepare-photo';

/** Decodes with `createImageBitmap` (it honours the EXIF orientation) and re-encodes as JPEG on a canvas. */
export const browserImageCodec: ImageCodec = {
  async decode(file: Blob): Promise<DecodedImage> {
    const bitmap = await createImageBitmap(file);
    return { height: bitmap.height, source: bitmap, width: bitmap.width };
  },

  async encode(source: unknown, width: number, height: number, quality: number): Promise<Blob> {
    const bitmap = source as ImageBitmap;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');

    if (context === null) throw new Error('Canvas is not available');

    context.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ quality, type: 'image/jpeg' });
  },
};
