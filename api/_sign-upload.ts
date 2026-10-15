import { createHash } from 'node:crypto';

export const UPLOAD_FOLDER = 'framed-by-santi/posts';
export const UPLOAD_PRESET = 'framed-by-santi';

export interface SignUploadEnv {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  cloudName: string | undefined;
  firebaseProjectId: string | undefined;
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const json = (status: number, body: Record<string, number | string>): Response =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

/** Reads the Firebase uid from the ID token payload. Not a verification: Firestore verifies the token. */
export const readUid = (idToken: string): string | null => {
  const payload = idToken.split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
    };

    return typeof claims.sub === 'string' && claims.sub.length > 0 ? claims.sub : null;
  } catch {
    return null;
  }
};

/** Cloudinary signature: SHA-1 of the sorted `key=value` pairs joined by `&`, followed by the secret. */
export const sign = (params: Record<string, number | string>, apiSecret: string): string => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
};

/**
 * Asks Firestore (as the caller, with their own ID token) for `admins/{uid}`.
 * The security rules only let a user read their own document, so a forged token or uid is refused there.
 */
const checkAdmin = async (
  fetchFn: FetchFn,
  projectId: string,
  uid: string,
  idToken: string
): Promise<'admin' | 'not-admin' | 'refused' | 'unavailable'> => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;

  try {
    const response = await fetchFn(url, { headers: { Authorization: `Bearer ${idToken}` } });

    if (response.ok) {
      return 'admin';
    }

    if (response.status === 404) {
      return 'not-admin';
    }

    return response.status === 401 || response.status === 403 ? 'refused' : 'unavailable';
  } catch {
    return 'unavailable';
  }
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

  const idToken = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  const uid = idToken ? readUid(idToken) : null;

  if (!idToken || !uid) {
    return json(401, { error: 'unauthorized' });
  }

  const access = await checkAdmin(fetchFn, firebaseProjectId, uid, idToken);

  if (access === 'refused') {
    return json(401, { error: 'unauthorized' });
  }

  if (access === 'not-admin') {
    return json(403, { error: 'forbidden' });
  }

  if (access === 'unavailable') {
    return json(502, { error: 'auth-unavailable' });
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
