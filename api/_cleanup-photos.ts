import { type FetchFn, requireAdmin } from './_admin-auth.js';
import { UPLOAD_FOLDER } from './_sign-upload.js';

/** Photos younger than this are never deleted: they may belong to a set that is still being written. */
const GRACE_DAYS = 7;
/** One run never deletes more than this, so a mistake cannot wipe the folder. */
const MAX_DELETES_PER_RUN = 100;
/** Public ids go in the address of a DELETE call, so the batches stay small and the address short. */
const DELETE_BATCH = 25;
const REQUEST_TIMEOUT_MS = 10000;

export interface CleanupEnv {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  cloudName: string | undefined;
  firebaseProjectId: string | undefined;
}

type Failure =
  | 'congratulations-unavailable'
  | 'delete-failed'
  | 'posts-unavailable'
  | 'settings-unavailable'
  | 'storage-unavailable';

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

type RestFields = Record<string, RestValue | undefined>;

interface RestValue {
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: RestFields };
  stringValue?: string;
}

/** The ids a saved photo map is known by: its full public id and its storage id. */
const photoIds = (fields: RestFields | undefined): string[] =>
  ['publicId', 'id']
    .map((key) => fields?.[key]?.stringValue)
    .filter((id): id is string => Boolean(id));

/**
 * The given fields of every document in a collection, page after page. Reads with the caller's own token,
 * which the rules let an admin do; any failure stops the clean-up with `fail`.
 */
const readCollection = async (
  fetchFn: FetchFn,
  projectId: string,
  idToken: string,
  name: string,
  field: string,
  fail: Failure
): Promise<RestFields[]> => {
  const all: RestFields[] = [];
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${name}?pageSize=300&mask.fieldPaths=${field}`;
  let pageToken: string | undefined;

  do {
    const url =
      pageToken === undefined ? base : `${base}&pageToken=${encodeURIComponent(pageToken)}`;
    const page = (await get(fetchFn, url, { Authorization: `Bearer ${idToken}` }, fail)) as {
      documents?: { fields?: RestFields }[];
      nextPageToken?: string;
    };

    for (const document of page.documents ?? []) all.push(document.fields ?? {});
    pageToken = page.nextPageToken;
  } while (pageToken !== undefined);

  return all;
};

/** Every photo id any set uses, hidden ones included. */
const readUsedPhotos = async (
  fetchFn: FetchFn,
  projectId: string,
  idToken: string
): Promise<Set<string>> => {
  const used = new Set<string>();
  const posts = await readCollection(
    fetchFn,
    projectId,
    idToken,
    'posts',
    'photos',
    'posts-unavailable'
  );

  for (const fields of posts) {
    for (const value of fields['photos']?.arrayValue?.values ?? []) {
      for (const id of photoIds(value.mapValue?.fields)) used.add(id);
    }
  }

  return used;
};

/** The photos the friends' messages use; a failure stops the clean-up, since they could be among the orphans. */
const readCongratulationPhotos = async (
  fetchFn: FetchFn,
  projectId: string,
  idToken: string
): Promise<string[]> => {
  const congratulations = await readCollection(
    fetchFn,
    projectId,
    idToken,
    'congratulations',
    'media',
    'congratulations-unavailable'
  );

  return congratulations.flatMap((fields) => {
    const media = fields['media']?.mapValue?.fields;
    return media?.['kind']?.stringValue === 'photo'
      ? photoIds(media['photo']?.mapValue?.fields)
      : [];
  });
};

/**
 * The photos the site settings use (the About portrait). A settings document that was never saved uses
 * none; any other failure stops the clean-up, because the portrait could be among the orphans.
 */
const readSettingsPhotos = async (
  fetchFn: FetchFn,
  projectId: string,
  idToken: string
): Promise<string[]> => {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/settings/site`;
  let document: {
    fields?: {
      profilePhoto?: { mapValue?: { fields?: Record<string, { stringValue?: string }> } };
    };
  };

  try {
    const response = await fetchFn(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 404) return [];
    if (!response.ok) throw new CleanupError('settings-unavailable');

    document = (await response.json()) as typeof document;
  } catch (error) {
    throw error instanceof CleanupError ? error : new CleanupError('settings-unavailable');
  }

  const fields = document.fields?.profilePhoto?.mapValue?.fields;
  return ['publicId', 'id']
    .map((key) => fields?.[key]?.stringValue)
    .filter((id): id is string => Boolean(id));
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
 * Deletes the photos in the upload folder that no set and no setting uses and that are old enough. It is
 * built to do nothing when in doubt: if the sets, the settings or Cloudinary cannot be read, nothing is deleted.
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

    for (const id of await readSettingsPhotos(fetchFn, firebaseProjectId, idToken)) used.add(id);
    for (const id of await readCongratulationPhotos(fetchFn, firebaseProjectId, idToken)) {
      used.add(id);
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
