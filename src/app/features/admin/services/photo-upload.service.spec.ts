import { TestBed } from '@angular/core/testing';

import { AuthStore } from '@features/auth/store/auth.store';

import { PhotoUploadError, PhotoUploadService } from './photo-upload.service';

const SIGNED = {
  apiKey: 'key-1',
  cloudName: 'demo-cloud',
  folder: 'framed-by-santi/posts',
  signature: 'sig-1',
  timestamp: 1_700_000_000,
  uploadPreset: 'framed-by-santi',
};

const json = (status: number, body: unknown): Response => Response.json(body, { status });

describe('PhotoUploadService', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let getIdToken: ReturnType<typeof vi.fn>;
  let service: PhotoUploadService;

  const blob = new Blob(['photo'], { type: 'image/jpeg' });

  beforeEach(() => {
    fetchFn = vi.fn();
    getIdToken = vi.fn().mockResolvedValue('id-token');
    vi.stubGlobal('fetch', fetchFn);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { getIdToken } }],
    });
    service = TestBed.inject(PhotoUploadService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should ask for a signature with the ID token, then upload to Cloudinary with it', async () => {
    fetchFn
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(
        json(200, { height: 3333, public_id: 'framed-by-santi/posts/abc', width: 5000 })
      );

    const result = await service.upload(blob);

    const [signUrl, signInit] = fetchFn.mock.calls[0];
    expect(signUrl).toBe('/api/sign-upload');
    expect(signInit).toMatchObject({
      headers: { Authorization: 'Bearer id-token' },
      method: 'POST',
    });

    const [uploadUrl, uploadInit] = fetchFn.mock.calls[1];
    const form = uploadInit.body as FormData;
    expect(uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(form.get('api_key')).toBe('key-1');
    expect(form.get('signature')).toBe('sig-1');
    expect(form.get('timestamp')).toBe('1700000000');
    expect(form.get('folder')).toBe('framed-by-santi/posts');
    expect(form.get('upload_preset')).toBe('framed-by-santi');
    expect(form.get('file')).toBeInstanceOf(Blob);

    expect(result).toEqual({ height: 3333, publicId: 'framed-by-santi/posts/abc', width: 5000 });
  });

  it('should upload a video with the same signature, to the video endpoint', async () => {
    fetchFn
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(json(200, { public_id: 'framed-by-santi/posts/v1' }));
    const video = new Blob(['video'], { type: 'video/mp4' });

    const result = await service.uploadVideo(video);

    const [uploadUrl, uploadInit] = fetchFn.mock.calls[1];
    const form = uploadInit.body as FormData;
    expect(uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo-cloud/video/upload');
    expect(form.get('signature')).toBe('sig-1');
    expect(form.get('folder')).toBe('framed-by-santi/posts');
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(result).toEqual({ publicId: 'framed-by-santi/posts/v1' });
  });

  it('should report a refused video upload as upload-failed', async () => {
    fetchFn.mockResolvedValueOnce(json(200, SIGNED)).mockResolvedValueOnce(json(400, {}));

    await expect(service.uploadVideo(new Blob(['video']))).rejects.toMatchObject({
      reason: 'upload-failed',
    });
  });

  it('should not call the network without a signed-in user', async () => {
    getIdToken.mockResolvedValue(null);

    await expect(service.upload(blob)).rejects.toMatchObject({ reason: 'not-allowed' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should map a refused signature to not-allowed and other failures to sign-failed', async () => {
    fetchFn.mockResolvedValueOnce(json(403, { error: 'forbidden' }));
    await expect(service.upload(blob)).rejects.toMatchObject({ reason: 'not-allowed' });

    fetchFn.mockResolvedValueOnce(json(502, { error: 'auth-unavailable' }));
    await expect(service.upload(blob)).rejects.toMatchObject({ reason: 'sign-failed' });

    fetchFn.mockRejectedValueOnce(new Error('offline'));
    await expect(service.upload(blob)).rejects.toMatchObject({ reason: 'sign-failed' });
  });

  it('should report a Cloudinary failure as upload-failed', async () => {
    fetchFn
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(json(400, { error: { message: 'Invalid signature' } }));

    const failure = service.upload(blob);

    await expect(failure).rejects.toBeInstanceOf(PhotoUploadError);
    await expect(failure).rejects.toMatchObject({ reason: 'upload-failed' });
  });

  it('should keep the reason Cloudinary gives for refusing an upload', async () => {
    fetchFn
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(
        json(400, { error: { message: 'Image file format mp4 not allowed' } })
      );

    await expect(service.uploadVideo(new Blob(['video']))).rejects.toMatchObject({
      detail: 'Image file format mp4 not allowed',
      reason: 'upload-failed',
    });
  });

  it('should have no reason to give when the refusal says none', async () => {
    fetchFn
      .mockResolvedValueOnce(json(200, SIGNED))
      .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));

    const error = await service.upload(blob).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ reason: 'upload-failed' });
    expect((error as PhotoUploadError).detail).toBeNull();
  });
});
