import { inject, Injectable } from '@angular/core';

import { AuthStore } from '@features/auth/store/auth.store';

export type PhotoUploadFailure = 'not-allowed' | 'sign-failed' | 'upload-failed';

export class PhotoUploadError extends Error {
  constructor(readonly reason: PhotoUploadFailure) {
    super(reason);
    this.name = 'PhotoUploadError';
  }
}

export interface UploadedPhoto {
  height: number;
  publicId: string;
  width: number;
}

export interface UploadedVideo {
  publicId: string;
}

interface UploadSignature {
  apiKey: string;
  cloudName: string;
  folder: string;
  signature: string;
  timestamp: number;
  uploadPreset: string;
}

interface CloudinaryResponse {
  height: number;
  public_id: string;
  width: number;
}

/** Uploads photos and videos straight to Cloudinary using a signature that only admins can get from `/api/sign-upload`. */
@Injectable({ providedIn: 'root' })
export class PhotoUploadService {
  private readonly authStore = inject(AuthStore);

  async upload(photo: Blob): Promise<UploadedPhoto> {
    const uploaded = (await this.send(photo, 'image')) as CloudinaryResponse;
    return { height: uploaded.height, publicId: uploaded.public_id, width: uploaded.width };
  }

  /** A video goes up with the same signature, to the video endpoint; Cloudinary picks the format when it is delivered. */
  async uploadVideo(video: Blob): Promise<UploadedVideo> {
    const uploaded = (await this.send(video, 'video')) as Pick<CloudinaryResponse, 'public_id'>;
    return { publicId: uploaded.public_id };
  }

  private async send(file: Blob, resourceType: 'image' | 'video'): Promise<unknown> {
    const signature = await this.sign();

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signature.apiKey);
    form.append('folder', signature.folder);
    form.append('signature', signature.signature);
    form.append('timestamp', String(signature.timestamp));
    form.append('upload_preset', signature.uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
        { body: form, method: 'POST' }
      );

      if (!response.ok) throw new PhotoUploadError('upload-failed');

      return await response.json();
    } catch (error) {
      throw error instanceof PhotoUploadError ? error : new PhotoUploadError('upload-failed');
    }
  }

  private async sign(): Promise<UploadSignature> {
    const idToken = await this.authStore.getIdToken();

    if (idToken === null) throw new PhotoUploadError('not-allowed');

    try {
      const response = await fetch('/api/sign-upload', {
        headers: { Authorization: `Bearer ${idToken}` },
        method: 'POST',
      });

      if (response.status === 401 || response.status === 403) {
        throw new PhotoUploadError('not-allowed');
      }

      if (!response.ok) throw new PhotoUploadError('sign-failed');

      return (await response.json()) as UploadSignature;
    } catch (error) {
      throw error instanceof PhotoUploadError ? error : new PhotoUploadError('sign-failed');
    }
  }
}
