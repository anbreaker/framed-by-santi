import { createHash } from 'node:crypto';

import { handleSignUpload, readUid, sign, SignUploadEnv } from './_sign-upload';

const ENV: SignUploadEnv = {
  apiKey: 'key-123',
  apiSecret: 'secret-xyz',
  cloudName: 'demo-cloud',
  firebaseProjectId: 'demo-project',
};

const tokenFor = (uid: string): string =>
  `h.${Buffer.from(JSON.stringify({ sub: uid })).toString('base64url')}.s`;

const post = (token?: string, method = 'POST'): Request =>
  new Request('https://example.test/api/sign-upload', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    method,
  });

const firestoreReturns = (status: number) => vi.fn(async () => new Response('{}', { status }));

describe('sign-upload', () => {
  it('should sign the sorted params followed by the secret with SHA-1', () => {
    const expected = createHash('sha1')
      .update('folder=f&timestamp=10&upload_preset=p' + 'secret-xyz')
      .digest('hex');

    expect(sign({ upload_preset: 'p', timestamp: 10, folder: 'f' }, 'secret-xyz')).toBe(expected);
  });

  it('should read the uid from the token payload and refuse malformed tokens', () => {
    expect(readUid(tokenFor('uid-1'))).toBe('uid-1');
    expect(readUid('not-a-jwt')).toBeNull();
    expect(readUid('a.%%%.c')).toBeNull();
  });

  it('should return the signature for an admin and ask Firestore with the caller token', async () => {
    const fetchFn = firestoreReturns(200);
    const token = tokenFor('uid-1');

    const response = await handleSignUpload(post(token), ENV, fetchFn, () => 1_700_000_000_000);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      apiKey: 'key-123',
      cloudName: 'demo-cloud',
      folder: 'framed-by-santi/posts',
      signature: sign(
        {
          folder: 'framed-by-santi/posts',
          timestamp: 1_700_000_000,
          upload_preset: 'framed-by-santi',
        },
        'secret-xyz'
      ),
      timestamp: 1_700_000_000,
      uploadPreset: 'framed-by-santi',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      'https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/admins/uid-1',
      expect.objectContaining({ headers: { Authorization: `Bearer ${token}` } })
    );
  });

  it('should never put the secret in the response', async () => {
    const response = await handleSignUpload(post(tokenFor('u')), ENV, firestoreReturns(200));

    expect(await response.text()).not.toContain('secret-xyz');
  });

  it('should refuse a signed-in user who is not an admin', async () => {
    const response = await handleSignUpload(post(tokenFor('u')), ENV, firestoreReturns(404));

    expect(response.status).toBe(403);
  });

  it('should refuse a token Firestore rejects', async () => {
    for (const status of [401, 403]) {
      const response = await handleSignUpload(post(tokenFor('u')), ENV, firestoreReturns(status));

      expect(response.status).toBe(401);
    }
  });

  it('should refuse a missing or malformed Authorization header without calling Firestore', async () => {
    const fetchFn = firestoreReturns(200);

    expect((await handleSignUpload(post(), ENV, fetchFn)).status).toBe(401);
    expect((await handleSignUpload(post('garbage'), ENV, fetchFn)).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should answer 502 when Firestore is unavailable, never signing', async () => {
    const down = vi.fn(async () => {
      throw new Error('network');
    });

    expect((await handleSignUpload(post(tokenFor('u')), ENV, down)).status).toBe(502);
    expect((await handleSignUpload(post(tokenFor('u')), ENV, firestoreReturns(500))).status).toBe(
      502
    );
  });

  it('should only accept POST', async () => {
    expect(
      (await handleSignUpload(post(tokenFor('u'), 'GET'), ENV, firestoreReturns(200))).status
    ).toBe(405);
  });

  it('should fail closed when the server is not configured', async () => {
    const response = await handleSignUpload(
      post(tokenFor('u')),
      { ...ENV, apiSecret: undefined },
      firestoreReturns(200)
    );

    expect(response.status).toBe(500);
  });
});
