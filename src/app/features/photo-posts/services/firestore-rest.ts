import { environment } from '@environments/environment';
import { FirebaseEnvironment } from '@environments/environment.model';

import { FirestoreValue, fromFirestoreFields } from '../utils/firestore-value';

export interface FirestoreDocument {
  data: Record<string, unknown>;
  id: string;
}

export interface FieldEquals {
  equals: boolean;
  field: string;
}

interface RestDocument {
  fields?: Record<string, FirestoreValue>;
  name: string;
}

interface RunQueryRow {
  document?: RestDocument;
}

const documentsUrl = (config: FirebaseEnvironment): string =>
  `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

const toDocument = (document: RestDocument): FirestoreDocument => ({
  data: fromFirestoreFields(document.fields ?? {}),
  id: document.name.split('/').pop() ?? '',
});

/**
 * Reads a collection through the Firestore REST API, so the public pages do not need the Firebase SDK.
 * The query runs unauthenticated, like the SDK does for a visitor, so the security rules still apply.
 */
export async function queryCollection(
  collectionId: string,
  where?: FieldEquals,
  config: FirebaseEnvironment = environment.firebase
): Promise<FirestoreDocument[]> {
  const structuredQuery: Record<string, unknown> = { from: [{ collectionId }] };
  if (where !== undefined) {
    structuredQuery['where'] = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: 'EQUAL',
        value: { booleanValue: where.equals },
      },
    };
  }

  const url = `${documentsUrl(config)}:runQuery?key=${config.apiKey}`;
  // A string body goes as text/plain, which Firestore accepts and the browser sends without a CORS preflight.
  const response = await fetch(url, { body: JSON.stringify({ structuredQuery }), method: 'POST' });
  if (!response.ok) throw new Error(`Firestore query failed with ${response.status}`);

  const rows = (await response.json()) as RunQueryRow[];
  return rows.flatMap(({ document }) => (document === undefined ? [] : [toDocument(document)]));
}

/** Reads one document through the Firestore REST API; null when it does not exist. */
export async function getDocument(
  collectionId: string,
  id: string,
  config: FirebaseEnvironment = environment.firebase
): Promise<FirestoreDocument | null> {
  const response = await fetch(
    `${documentsUrl(config)}/${collectionId}/${id}?key=${config.apiKey}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed with ${response.status}`);

  return toDocument((await response.json()) as RestDocument);
}
