/** Long edge of the preview shown in the editor; the upload itself keeps its own, larger size. */
export const PREVIEW_WIDTH = 800;

/**
 * A small JPEG of a photo for the editor to show while it uploads. The browser shrinks the picture
 * while it decodes it, so a 40 MP file never has to be fully decoded just to be previewed.
 * Returns an object URL; whoever shows it releases it with `URL.revokeObjectURL`.
 */
export async function makePreview(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file, {
    resizeQuality: 'low',
    resizeWidth: PREVIEW_WIDTH,
  });

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('no 2d context');

    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ quality: 0.7, type: 'image/jpeg' });

    return URL.createObjectURL(blob);
  } finally {
    bitmap.close();
  }
}
