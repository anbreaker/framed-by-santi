import { InjectionToken } from '@angular/core';

import { PhotoUploadError } from '../services/photo-upload.service';
import { browserImageCodec } from './browser-image-codec';
import { makePreview } from './browser-preview';
import { ImageCodec, PhotoRejectedError } from './prepare-photo';

/** Makes the small preview shown while a photo uploads; replaced in tests. */
export const PREVIEW_MAKER = new InjectionToken<(file: File) => Promise<string>>('PREVIEW_MAKER', {
  factory: (): ((file: File) => Promise<string>) => makePreview,
});

/** Decodes and re-encodes photos before they upload; replaced in tests. */
export const IMAGE_CODEC = new InjectionToken<ImageCodec>('IMAGE_CODEC', {
  factory: (): ImageCodec => browserImageCodec,
});

const UPLOAD_ERROR_KEYS: Record<PhotoRejectedError['reason'] | PhotoUploadError['reason'], string> =
  {
    'not-allowed': 'admin.upload.errors.notAllowed',
    'sign-failed': 'admin.upload.errors.signFailed',
    'too-large': 'admin.upload.errors.tooLarge',
    unreadable: 'admin.upload.errors.unreadable',
    'unsupported-type': 'admin.upload.errors.unsupportedType',
    'upload-failed': 'admin.upload.errors.uploadFailed',
  };

/** The message for why a photo could not be prepared or uploaded; anything unexpected is a failed upload. */
export function uploadErrorKey(error: unknown): string {
  return error instanceof PhotoRejectedError || error instanceof PhotoUploadError
    ? UPLOAD_ERROR_KEYS[error.reason]
    : UPLOAD_ERROR_KEYS['upload-failed'];
}
