import { CleanupEnv, handleCleanup } from './_cleanup-photos.js';

const ENV: CleanupEnv = {
  apiKey: 'key-123',
  apiSecret: 'secret-xyz',
  cloudName: 'demo-cloud',
  firebaseProjectId: 'demo-project',
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-15T12:00:00Z');
const FOLDER = 'framed-by-santi/posts';

const tokenFor = (uid: string): string =>
  `h.${Buffer.from(JSON.stringify({ sub: uid })).toString('base64url')}.s`;

const request = (
  options: { body?: unknown; method?: string; token?: string | null } = {}
): Request => {
  const { body, method = 'POST', token = tokenFor('uid-1') } = options;

  return new Request('https://example.test/api/cleanup-photos', {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    method,
  });
};

const daysAgo = (days: number): string => new Date(NOW - days * DAY).toISOString();
const photo = (name: string, age: number): { created_at: string; public_id: string } => ({
  created_at: daysAgo(age),
  public_id: `${FOLDER}/${name}`,
});
const post = (...publicIds: string[]): Record<string, unknown> => ({
  fields: {
    photos: {
      arrayValue: {
        values: publicIds.map((publicId) => ({
          mapValue: { fields: { publicId: { stringValue: publicId } } },
        })),
      },
    },
  },
});

interface World {
  /** Pages of Firestore documents; each inner array is one page. */
  postPages?: Record<string, unknown>[][];
  /** Pages of Cloudinary resources. */
  resourcePages?: { created_at: string; public_id: string }[][];
  admin?: number;
  firestoreStatus?: number;
  /** The `settings/site` document; missing means it was never saved (404). */
  settings?: Record<string, unknown>;
  settingsStatus?: number;
  cloudinaryListStatus?: number;
  cloudinaryDeleteStatus?: number;
  /** What Cloudinary says per id in a successful delete; defaults to 'deleted' for every id. */
  deleteResult?: (id: string) => string;
}

/** A fake network for the admin check, Firestore, and the Cloudinary Admin API. */
const network = (world: World = {}) => {
  const calls: { init?: RequestInit; url: string }[] = [];
  const deleted: string[] = [];

  const fetchFn = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ init, url });

    if (url.includes('/documents/admins/')) {
      return new Response('{}', { status: world.admin ?? 200 });
    }

    if (url.includes('/documents/settings/site')) {
      if (world.settingsStatus) return new Response('{}', { status: world.settingsStatus });
      return world.settings
        ? Response.json(world.settings)
        : new Response('{"error":{"status":"NOT_FOUND"}}', { status: 404 });
    }

    if (url.includes('/documents/posts')) {
      if (world.firestoreStatus) return new Response('{}', { status: world.firestoreStatus });

      const pages = world.postPages ?? [[]];
      const token = new URL(url).searchParams.get('pageToken');
      const index = token === null ? 0 : Number(token);

      return Response.json({
        ...(pages[index].length > 0 && { documents: pages[index] }),
        ...(index + 1 < pages.length && { nextPageToken: String(index + 1) }),
      });
    }

    if (url.startsWith('https://api.cloudinary.com/') && init?.method === 'DELETE') {
      if (world.cloudinaryDeleteStatus)
        return new Response('{}', { status: world.cloudinaryDeleteStatus });

      const ids = new URL(url).searchParams.getAll('public_ids[]');
      deleted.push(...ids);
      return Response.json({
        deleted: Object.fromEntries(ids.map((id) => [id, world.deleteResult?.(id) ?? 'deleted'])),
      });
    }

    if (url.startsWith('https://api.cloudinary.com/')) {
      if (world.cloudinaryListStatus)
        return new Response('{}', { status: world.cloudinaryListStatus });

      const pages = world.resourcePages ?? [[]];
      const cursor = new URL(url).searchParams.get('next_cursor');
      const index = cursor === null ? 0 : Number(cursor);

      return Response.json({
        ...(index + 1 < pages.length && { next_cursor: String(index + 1) }),
        resources: pages[index],
      });
    }

    throw new Error(`unexpected request ${url}`);
  });

  return { calls, deleted, fetchFn };
};

const run = (world: World, options: Parameters<typeof request>[0] = {}, env: CleanupEnv = ENV) => {
  const net = network(world);

  return { net, response: handleCleanup(request(options), env, net.fetchFn, () => NOW) };
};

describe('cleanup-photos', () => {
  it('should only accept POST and report a missing configuration without calling anything', async () => {
    const wrongMethod = run({}, { method: 'GET' });
    const noConfig = run({}, {}, { ...ENV, apiSecret: undefined });

    expect((await wrongMethod.response).status).toBe(405);
    expect((await noConfig.response).status).toBe(500);
    expect(noConfig.net.fetchFn).not.toHaveBeenCalled();
  });

  it('should refuse callers who are not admins before touching Firestore posts or Cloudinary', async () => {
    const { net, response } = run({ admin: 404 });

    expect((await response).status).toBe(403);
    expect(net.calls.every((call) => call.url.includes('/documents/admins/'))).toBe(true);
  });

  it('should delete only the photos that no set uses and are older than the grace period', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('used', 40), photo('orphan-old', 40), photo('orphan-new', 2)]],
    });

    const body = await (await response).json();

    expect(net.deleted).toEqual([`${FOLDER}/orphan-old`]);
    expect(body).toMatchObject({ deleted: [`${FOLDER}/orphan-old`], dryRun: false });
  });

  it('should count a photo as used when any set references it, hidden drafts and every page included', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/a`)], [post(`${FOLDER}/b`, `${FOLDER}/c`)]],
      resourcePages: [
        [photo('a', 40), photo('b', 40)],
        [photo('c', 40), photo('orphan', 40)],
      ],
    });
    await response;

    expect(net.deleted).toEqual([`${FOLDER}/orphan`]);
  });

  it('should read the sets with the caller token and ask Cloudinary with basic auth, for the upload folder only', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[]],
    });
    await response;

    const posts = net.calls.find((call) => call.url.includes('/documents/posts'));
    const cloudinary = net.calls.find((call) => call.url.startsWith('https://api.cloudinary.com/'));

    expect((posts?.init?.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${tokenFor('uid-1')}`
    );
    expect(new URL(cloudinary?.url ?? '').searchParams.get('prefix')).toBe(`${FOLDER}/`);
    expect((cloudinary?.init?.headers as Record<string, string>)['Authorization']).toBe(
      `Basic ${Buffer.from('key-123:secret-xyz').toString('base64')}`
    );
  });

  it('should only report what it would delete in a dry run', async () => {
    const { net, response } = run(
      { postPages: [[post(`${FOLDER}/used`)]], resourcePages: [[photo('orphan', 40)]] },
      { body: { dryRun: true } }
    );

    expect(await (await response).json()).toMatchObject({
      deleted: [`${FOLDER}/orphan`],
      dryRun: true,
    });
    expect(net.deleted).toEqual([]);
  });

  it('should never delete a photo outside the upload folder', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [
        [{ created_at: daysAgo(40), public_id: 'somewhere-else/photo' }, photo('orphan', 40)],
      ],
    });
    await response;

    expect(net.deleted).toEqual([`${FOLDER}/orphan`]);
  });

  it('should delete nothing when the sets cannot be read, because it could not tell what is used', async () => {
    const { net, response } = run({
      firestoreStatus: 500,
      resourcePages: [[photo('orphan', 40)]],
    });

    expect((await response).status).toBe(502);
    expect(net.deleted).toEqual([]);
    expect(net.calls.some((call) => call.url.startsWith('https://api.cloudinary.com/'))).toBe(
      false
    );
  });

  it('should keep the profile photo chosen in the settings, though no set uses it', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('used', 40), photo('profile', 40), photo('orphan', 40)]],
      settings: {
        fields: {
          profilePhoto: { mapValue: { fields: { id: { stringValue: `${FOLDER}/profile` } } } },
        },
      },
    });
    await response;

    expect(net.deleted).toEqual([`${FOLDER}/orphan`]);
  });

  it('should read the settings with the caller token', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('used', 40)]],
    });
    await response;

    const call = net.calls.find((item) => item.url.includes('/documents/settings/site'));
    expect(call?.url).toBe(
      'https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/settings/site'
    );
    expect(new Headers(call?.init?.headers).get('Authorization')).toBe(
      `Bearer ${tokenFor('uid-1')}`
    );
  });

  it('should delete nothing when the settings cannot be read, because the profile photo may be among them', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('orphan', 40)]],
      settingsStatus: 500,
    });

    expect((await response).status).toBe(502);
    expect(await (await response).json()).toEqual({ error: 'settings-unavailable' });
    expect(net.deleted).toEqual([]);
  });

  it('should delete nothing when Cloudinary cannot be listed or the delete is refused', async () => {
    const listFails = run({
      cloudinaryListStatus: 401,
      postPages: [[post(`${FOLDER}/used`)]],
    });
    expect((await listFails.response).status).toBe(502);

    const deleteFails = run({
      cloudinaryDeleteStatus: 500,
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('orphan', 40)]],
    });
    expect((await deleteFails.response).status).toBe(502);
  });

  it('should delete at most 100 photos per run, oldest first, and say there is more to do', async () => {
    const many = Array.from({ length: 130 }, (_, index) => photo(`orphan-${index}`, 40 + index));
    const { net, response } = run({ postPages: [[post(`${FOLDER}/used`)]], resourcePages: [many] });

    const body = await (await response).json();

    expect(net.deleted).toHaveLength(100);
    expect(net.deleted[0]).toBe(`${FOLDER}/orphan-129`);
    expect(body).toMatchObject({ remaining: 30 });
  });

  it('should delete nothing when it finds no set at all: it cannot tell what is used', async () => {
    const { net, response } = run({
      postPages: [[]],
      resourcePages: [[photo('a', 40), photo('b', 40)]],
    });

    const body = await (await response).json();

    expect(net.deleted).toEqual([]);
    expect(body).toMatchObject({ deleted: [], skipped: 'no-sets-found' });
  });

  it('should only report as deleted what Cloudinary confirmed, and say what failed', async () => {
    const { response } = run({
      deleteResult: (id) =>
        id.endsWith('bad') ? 'error' : id.endsWith('gone') ? 'not_found' : 'deleted',
      postPages: [[post(`${FOLDER}/used`)]],
      resourcePages: [[photo('used', 40), photo('ok', 40), photo('bad', 41), photo('gone', 42)]],
    });

    const body = await (await response).json();

    expect(body.deleted.sort()).toEqual([`${FOLDER}/gone`, `${FOLDER}/ok`]);
    expect(body.failed).toEqual([`${FOLDER}/bad`]);
    expect(body.remaining).toBe(1);
  });

  it('should send the deletes in small batches so the address never gets too long', async () => {
    const many = Array.from({ length: 60 }, (_, index) => photo(`orphan-${index}`, 40 + index));
    const { net, response } = run({ postPages: [[post(`${FOLDER}/used`)]], resourcePages: [many] });
    await response;

    const deleteCalls = net.calls.filter((call) => call.init?.method === 'DELETE');

    expect(net.deleted).toHaveLength(60);
    expect(deleteCalls.length).toBeGreaterThanOrEqual(3);
    expect(
      deleteCalls.every(
        (call) => new URL(call.url).searchParams.getAll('public_ids[]').length <= 25
      )
    ).toBe(true);
  });

  it('should have nothing to do when nothing is orphaned', async () => {
    const { net, response } = run({
      postPages: [[post(`${FOLDER}/a`)]],
      resourcePages: [[photo('a', 40)]],
    });

    expect(await (await response).json()).toMatchObject({ deleted: [], remaining: 0 });
    expect(net.calls.some((call) => call.init?.method === 'DELETE')).toBe(false);
  });
});
