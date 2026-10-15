import { readUid, requireAdmin } from './_admin-auth.js';

const tokenFor = (uid: unknown): string =>
  `h.${Buffer.from(JSON.stringify({ sub: uid })).toString('base64url')}.s`;

const request = (token: string): Request =>
  new Request('https://example.test/api/x', {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
  });

describe('readUid', () => {
  it.each([['abc123XYZ'], ['uid-1'], ['a_b'], ['x'.repeat(128)]])(
    'should accept the Firebase user id %s',
    (uid) => {
      expect(readUid(tokenFor(uid))).toBe(uid);
    }
  );

  it.each([['..'], ['.'], ['a/b'], ['%2F'], ['a b'], ['x'.repeat(129)], [''], [42]])(
    'should reject %s, which is not a Firebase user id and must never reach a URL path',
    (uid) => {
      expect(readUid(tokenFor(uid))).toBeNull();
    }
  );
});

describe('requireAdmin', () => {
  it('should answer 401 without asking Firestore when the user id is not valid', async () => {
    const fetchFn = vi.fn();

    const response = await requireAdmin(request(tokenFor('..')), 'demo-project', fetchFn);

    expect(response?.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should not wait forever for Firestore: the request carries a timeout signal', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));

    await requireAdmin(request(tokenFor('uid-1')), 'demo-project', fetchFn);

    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('should answer 502 when the Firestore request is aborted', async () => {
    const fetchFn = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });

    const response = await requireAdmin(request(tokenFor('uid-1')), 'demo-project', fetchFn);

    expect(response?.status).toBe(502);
  });
});
