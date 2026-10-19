import { InjectionToken } from '@angular/core';

import { browserImageCodec } from './browser-image-codec';
import { makePreview } from './browser-preview';
import { ImageCodec } from './prepare-photo';

/** Makes the small preview shown while a photo uploads; replaced in tests. */
export const PREVIEW_MAKER = new InjectionToken<(file: File) => Promise<string>>('PREVIEW_MAKER', {
  factory: (): ((file: File) => Promise<string>) => makePreview,
});

/** Decodes and re-encodes photos before they upload; replaced in tests. */
export const IMAGE_CODEC = new InjectionToken<ImageCodec>('IMAGE_CODEC', {
  factory: (): ImageCodec => browserImageCodec,
});
