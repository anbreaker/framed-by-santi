import { FirebaseEnvironment } from '@environments/environment.model';

import { queryCollection } from './firestore-rest';

const CONFIG: FirebaseEnvironment = {
  apiKey: 'key',
  appId: 'app',
  authDomain: 'example.firebaseapp.com',
  messagingSenderId: '1',
  projectId: 'project',
  storageBucket: 'example.firebasestorage.app',
};

const answer = (body: unknown, ok = true): Response =>
  ({ json: () => Promise.resolve(body), ok, status: ok ? 200 : 403 }) as Response;

describe('queryCollection', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should post a structured query for the collection to the project', async () => {
    fetchMock.mockResolvedValue(answer([]));

    await queryCollection('themes', undefined, CONFIG);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://firestore.googleapis.com/v1/projects/project/databases/(default)/documents:runQuery?key=key'
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      structuredQuery: { from: [{ collectionId: 'themes' }] },
    });
  });

  it('should send the body as a plain string, so the browser needs no CORS preflight', async () => {
    fetchMock.mockResolvedValue(answer([]));

    await queryCollection('themes', undefined, CONFIG);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(typeof init.body).toBe('string');
    expect(init.headers).toBeUndefined();
  });

  it('should filter on a field being equal to a value', async () => {
    fetchMock.mockResolvedValue(answer([]));

    await queryCollection('posts', { field: 'hidden', equals: false }, CONFIG);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      structuredQuery: {
        from: [{ collectionId: 'posts' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'hidden' },
            op: 'EQUAL',
            value: { booleanValue: false },
          },
        },
      },
    });
  });

  it('should return each document with its id and plain data, skipping rows without one', async () => {
    fetchMock.mockResolvedValue(
      answer([
        {
          document: {
            fields: { label: { stringValue: 'Sunset' } },
            name: 'projects/project/databases/(default)/documents/themes/sunset',
          },
        },
        { document: { name: 'projects/project/databases/(default)/documents/themes/bare' } },
        { readTime: '2026-10-19T10:00:00Z' },
      ])
    );

    await expect(queryCollection('themes', undefined, CONFIG)).resolves.toEqual([
      { data: { label: 'Sunset' }, id: 'sunset' },
      { data: {}, id: 'bare' },
    ]);
  });

  it('should fail when Firestore refuses the query', async () => {
    fetchMock.mockResolvedValue(answer({ error: { status: 'PERMISSION_DENIED' } }, false));

    await expect(queryCollection('posts', undefined, CONFIG)).rejects.toThrow('403');
  });
});
