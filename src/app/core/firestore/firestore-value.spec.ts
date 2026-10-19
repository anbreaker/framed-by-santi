import { fromFirestoreFields } from './firestore-value';

describe('fromFirestoreFields', () => {
  it('should turn the typed REST values into plain data', () => {
    expect(
      fromFirestoreFields({
        caption: { stringValue: 'Hola' },
        count: { integerValue: '3' },
        hidden: { booleanValue: false },
        missing: { nullValue: null },
        ratio: { doubleValue: 1.5 },
        takenAt: { timestampValue: '2026-10-15T08:00:00Z' },
      })
    ).toEqual({
      caption: 'Hola',
      count: 3,
      hidden: false,
      missing: null,
      ratio: 1.5,
      takenAt: '2026-10-15T08:00:00Z',
    });
  });

  it('should decode nested maps and arrays', () => {
    expect(
      fromFirestoreFields({
        caption: { mapValue: { fields: { en: { stringValue: 'Hi' } } } },
        empty: { arrayValue: {} },
        photos: {
          arrayValue: {
            values: [
              {
                mapValue: { fields: { id: { stringValue: 'p/1' }, width: { integerValue: '20' } } },
              },
            ],
          },
        },
        tags: { arrayValue: { values: [{ stringValue: 'night' }] } },
      })
    ).toEqual({
      caption: { en: 'Hi' },
      empty: [],
      photos: [{ id: 'p/1', width: 20 }],
      tags: ['night'],
    });
  });

  it('should read an empty map as an empty object', () => {
    expect(fromFirestoreFields({ caption: { mapValue: {} } })).toEqual({ caption: {} });
  });

  it('should leave a value of an unknown kind undefined, so the document fails validation', () => {
    expect(fromFirestoreFields({ place: { geoPointValue: { latitude: 1 } } })).toEqual({
      place: undefined,
    });
  });
});
