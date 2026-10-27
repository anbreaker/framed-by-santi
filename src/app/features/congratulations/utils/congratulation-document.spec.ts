import { congratulationFromDocument, congratulationToDocument } from './congratulation-document';

const photo = {
  alt: 'Ana and Santi',
  height: 800,
  id: 'p1',
  publicId: 'framed-by-santi/posts/p1',
  width: 1200,
};
const second = { ...photo, id: 'p2', publicId: 'framed-by-santi/posts/p2' };

const read = (media: unknown) =>
  congratulationFromDocument('c1', { createdAt: 1, from: 'Ana', media, message: 'Hi' });

describe('congratulationToDocument', () => {
  it('should save exactly the fields the rules accept, with no media as null', () => {
    expect(congratulationToDocument({ from: 'Ana', media: [], message: 'Hi' }, 42)).toEqual({
      createdAt: 42,
      from: 'Ana',
      media: null,
      message: 'Hi',
    });
  });

  it('should save photos and videos together, in order, as one gallery', () => {
    const media = [
      { kind: 'photo' as const, photo },
      { kind: 'youtube' as const, video: 'dQw4w9WgXcQ' },
      { kind: 'cloudinary' as const, publicId: 'framed-by-santi/posts/v1' },
    ];

    expect(congratulationToDocument({ from: 'Ana', media, message: 'Hi' }, 42).media).toEqual({
      items: media,
      kind: 'gallery',
    });
  });
});

describe('congratulationFromDocument', () => {
  it('should read a message without media as one with an empty list', () => {
    expect(read(null)).toEqual({ createdAt: 1, from: 'Ana', id: 'c1', media: [], message: 'Hi' });
  });

  it('should keep a photo marked to show whole, and read any other value as cropped', () => {
    const media = read({
      items: [
        { kind: 'photo', photo, whole: true },
        { kind: 'photo', photo: second, whole: 'yes' },
      ],
      kind: 'gallery',
    })?.media;

    expect(media).toEqual([
      { kind: 'photo', photo, whole: true },
      { kind: 'photo', photo: second },
    ]);
  });

  it('should read a gallery of photos and videos in order', () => {
    const items = [
      { kind: 'youtube', video: 'dQw4w9WgXcQ' },
      { kind: 'photo', photo },
      { kind: 'cloudinary', publicId: 'framed-by-santi/posts/v1' },
    ];

    expect(read({ items, kind: 'gallery' })?.media).toEqual(items);
  });

  it('should drop the items of a gallery it cannot read and keep the rest', () => {
    const media = read({
      items: [
        { kind: 'vimeo', video: '1' },
        { kind: 'photo', photo: { id: 'broken' } },
        'x',
        { kind: 'photo', photo },
      ],
      kind: 'gallery',
    })?.media;

    expect(media).toEqual([{ kind: 'photo', photo }]);
    expect(read({ items: 'x', kind: 'gallery' })?.media).toEqual([]);
  });

  it.each([
    ['several photos', { kind: 'photo', photos: [photo, second] }, [photo, second]],
    ['a single photo', { kind: 'photo', photo }, [photo]],
  ])('should read a message saved earlier with %s as photo items', (_case, media, photos) => {
    expect(read(media)?.media).toEqual(photos.map((item) => ({ kind: 'photo', photo: item })));
  });

  it('should read a message saved earlier with one video as a list of one', () => {
    for (const media of [
      { kind: 'youtube', video: 'dQw4w9WgXcQ' },
      { kind: 'cloudinary', publicId: 'framed-by-santi/posts/v1' },
    ]) {
      expect(read(media)?.media).toEqual([media]);
    }
  });

  it('should keep the words when the media is not one it knows', () => {
    expect(read({ kind: 'vimeo', video: '1' })).toEqual({
      createdAt: 1,
      from: 'Ana',
      id: 'c1',
      media: [],
      message: 'Hi',
    });
  });

  it.each([
    ['nothing', undefined],
    ['no sender', { createdAt: 1, message: 'Hi' }],
    ['no message', { createdAt: 1, from: 'Ana' }],
    ['no date', { from: 'Ana', message: 'Hi' }],
  ])('should skip a document with %s', (_case, data) => {
    expect(congratulationFromDocument('c1', data)).toBeNull();
  });
});
