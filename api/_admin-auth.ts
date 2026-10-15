export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

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

/**
 * Asks Firestore (as the caller, with their own ID token) for `admins/{uid}`.
 * The security rules only let a user read their own document, so a forged token or uid is refused there.
 */
export const checkAdmin = async (
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

/**
 * Lets only signed-in admins through. Returns the error response to send back, or null when the caller is an admin.
 */
export const requireAdmin = async (
  request: Request,
  firebaseProjectId: string,
  fetchFn: FetchFn
): Promise<Response | null> => {
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

  return null;
};
