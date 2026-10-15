import { type FetchFn, requireAdmin } from './_admin-auth.js';
import { UPLOAD_FOLDER } from './_sign-upload.js';

/** Photos younger than this are never deleted: they may belong to a set that is still being written. */
const GRACE_DAYS = 7;
/** One run never deletes more than this, so a mistake cannot wipe the folder. */
const MAX_DELETES_PER_RUN = 100;
/** Public ids go in the address of a DELETE call, so the batches stay small and the address short. */
const DELETE_BATCH = 25;
const REQUEST_TIMEOUT_MS = 10_000;

export interface CleanupEnv {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  cloudName: string | undefined;
  firebaseProjectId: string | undefined;
}

type Failure = 'delete-failed' | 'posts-unavailable' | 'storage-unavailable';

class CleanupError extends Error {
  constructor(readonly reason: Failure) {
    super(reason);
  }
}

interface Resource {
  created_at: string;
  public_id: string;
}

const json = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });

const get = async (
  fetchFn: FetchFn,
  url: string,
  headers: Record<string, string>,
  fail: Failure
): Promise<unknown> => {
  try {
    const response = await fetchFn(url, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new CleanupError(fail);
    }

    return await response.json();
  } catch (error) {
    throw error instanceof CleanupError ? error : new CleanupError(fail);
  }
};

/** Every photo id any set uses, hidden ones included. Reads with the caller's own token, which the rules let an admin do. */
const readUsedPhotos = async (
  fetchFn: FetchFn,
  projectId: string,
  idToken: string
): Promise<Set<string>> => {
  const used = new Set<string>();
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/posts?pageSize=300&mask.fieldPaths=photos`;
  let pageToken: string | undefined;

  do {
    const url =
      pageToken === undefined ? base : `${base}&pageToken=${encodeURIComponent(pageToken)}`;
    const page = (await get(
      fetchFn,
      url,
      { Authorization: `Bearer ${idToken}` },
      'posts-unavailable'
    )) as {
      documents?: { fields?: { photos?: { arrayValue?: { values?: unknown[] } } } }[];
      nextPageToken?: string;
    };

    for (const document of page.documents ?? []) {
      for (const value of document.fields?.photos?.arrayValue?.values ?? []) {
        const fields = (
          value as { mapValue?: { fields?: Record<string, { stringValue?: string }> } }
        ).mapValue?.fields;

        for (const key of ['publicId', 'id']) {
          const id = fields?.[key]?.stringValue;
          if (id) used.add(id);
        }
      }
    }

    pageToken = page.nextPageToken;
  } while (pageToken !== undefined);

  return used;
};

const adminUrl = (cloudName: string): string =>
  `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload`;

const listUploads = async (
  fetchFn: FetchFn,
  cloudName: string,
  authorization: string
): Promise<Resource[]> => {
  const resources: Resource[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ max_results: '500', prefix: `${UPLOAD_FOLDER}/` });
    if (cursor !== undefined) params.set('next_cursor', cursor);

    const page = (await get(
      fetchFn,
      `${adminUrl(cloudName)}?${params}`,
      { Authorization: authorization },
      'storage-unavailable'
    )) as {
      next_cursor?: string;
      resources?: Resource[];
    };

    resources.push(...(page.resources ?? []));
    cursor = page.next_cursor;
  } while (cursor !== undefined);

  return resources;
};

interface DeleteOutcome {
  /** Gone from Cloudinary: deleted now, or already missing. */
  confirmed: string[];
  /** Cloudinary answered but did not delete them. */
  failed: string[];
}

/** Deletes in small batches and trusts only what Cloudinary confirms for each id. */
const deleteUploads = async (
  fetchFn: FetchFn,
  cloudName: string,
  authorization: string,
  ids: string[]
): Promise<DeleteOutcome> => {
  const outcome: DeleteOutcome = { confirmed: [], failed: [] };

  for (let start = 0; start < ids.length; start += DELETE_BATCH) {
    const batch = ids.slice(start, start + DELETE_BATCH);
    const params = new URLSearchParams();
    batch.forEach((id) => params.append('public_ids[]', id));

    try {
      const response = await fetchFn(`${adminUrl(cloudName)}?${params}`, {
        headers: { Authorization: authorization },
        method: 'DELETE',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new CleanupError('delete-failed');
      }

      const { deleted } = (await response.json()) as { deleted?: Record<string, string> };

      for (const id of batch) {
        const state = deleted?.[id];
        (state === 'deleted' || state === 'not_found' ? outcome.confirmed : outcome.failed).push(
          id
        );
      }
    } catch (error) {
      throw error instanceof CleanupError ? error : new CleanupError('delete-failed');
    }
  }

  return outcome;
};

/**
 * Deletes the photos in the upload folder that no set uses and that are old enough. It is built to do
 * nothing when in doubt: if the sets or Cloudinary cannot be read, nothing is deleted.
 */
export const handleCleanup = async (
  request: Request,
  env: CleanupEnv,
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

  const idToken = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1] ?? '';
  let dryRun = false;

  try {
    const text = await request.text();
    dryRun = text.trim() !== '' && (JSON.parse(text) as { dryRun?: unknown }).dryRun === true;
  } catch {
    return json(400, { error: 'invalid-request' });
  }

  const authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;

  try {
    const used = await readUsedPhotos(fetchFn, firebaseProjectId, idToken);

    // With no set found it cannot tell what is used (a wrong project, a mistaken empty read): keep everything.
    if (used.size === 0) {
      return json(200, {
        deleted: [],
        dryRun,
        failed: [],
        remaining: 0,
        scanned: 0,
        skipped: 'no-sets-found',
      });
    }

    const uploads = await listUploads(fetchFn, cloudName, authorization);
    const cutoff = now() - GRACE_DAYS * 24 * 60 * 60 * 1000;

    const orphans = uploads
      .filter(
        (item) =>
          item.public_id.startsWith(`${UPLOAD_FOLDER}/`) &&
          !used.has(item.public_id) &&
          Date.parse(item.created_at) <= cutoff
      )
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const batch = orphans.slice(0, MAX_DELETES_PER_RUN).map((item) => item.public_id);

    const outcome: DeleteOutcome =
      dryRun || batch.length === 0
        ? { confirmed: dryRun ? batch : [], failed: [] }
        : await deleteUploads(fetchFn, cloudName, authorization, batch);

    return json(200, {
      deleted: outcome.confirmed,
      dryRun,
      failed: outcome.failed,
      remaining: orphans.length - outcome.confirmed.length,
      scanned: uploads.length,
    });
  } catch (error) {
    return json(502, { error: error instanceof CleanupError ? error.reason : 'cleanup-failed' });
  }
};
