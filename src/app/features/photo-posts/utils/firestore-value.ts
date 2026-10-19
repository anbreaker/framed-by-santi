/** A field value as the Firestore REST API sends it: one key naming its type. */
export type FirestoreValue = Record<string, unknown>;

/**
 * Turns the typed fields of a REST document into the plain data the SDK would give. Timestamps stay ISO
 * strings, and a kind the site never stores is left undefined so the document fails validation instead of
 * being guessed.
 */
export function fromFirestoreFields(
  fields: Record<string, FirestoreValue>
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));
}

function fromValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value['stringValue'];
  if ('booleanValue' in value) return value['booleanValue'];
  if ('integerValue' in value) return Number(value['integerValue']);
  if ('doubleValue' in value) return value['doubleValue'];
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value['timestampValue'];
  if ('arrayValue' in value) {
    const { values = [] } = value['arrayValue'] as { values?: FirestoreValue[] };
    return values.map(fromValue);
  }
  if ('mapValue' in value) {
    const { fields = {} } = value['mapValue'] as { fields?: Record<string, FirestoreValue> };
    return fromFirestoreFields(fields);
  }
  return undefined;
}
