import { createHash } from 'node:crypto';

import { type FetchFn, readUid, requireAdmin } from './_admin-auth.js';

export { readUid };

export const UPLOAD_FOLDER = 'framed-by-santi/posts';
export const UPLOAD_PRESET = 'framed-by-santi';

export interface SignUploadEnv {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  cloudName: string | undefined;
  firebaseProjectId: string | undefined;
}

const json = (status: number, body: Record<string, number | string>): Response =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

/** Cloudinary signature: SHA-1 of the sorted `key=value` pairs joined by `&`, followed by the secret. */
export const sign = (params: Record<string, number | string>, apiSecret: string): string => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
};

export const handleSignUpload = async (
  request: Request,
  env: SignUploadEnv,
  fetchFn: FetchFn = fetch,
  now: () => number = Date.now
): Promise<Response> => {
  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const { apiKey, apiSecret, cloudName, firebaseProjectId } = env;

  if (!apiKey || !apiSecret || !cloudName || !firebaseProjectId) {
    return json(500, { error: 'not-configured' });
  }

  const denied = await requireAdmin(request, firebaseProjectId, fetchFn);

  if (denied) {
    return denied;
  }

  const timestamp = Math.floor(now() / 1000);
  const params = { folder: UPLOAD_FOLDER, timestamp, upload_preset: UPLOAD_PRESET };

  return json(200, {
    apiKey,
    cloudName,
    folder: UPLOAD_FOLDER,
    signature: sign(params, apiSecret),
    timestamp,
    uploadPreset: UPLOAD_PRESET,
  });
};
