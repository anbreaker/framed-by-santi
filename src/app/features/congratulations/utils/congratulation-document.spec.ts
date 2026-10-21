import { congratulationFromDocument, congratulationToDocument } from './congratulation-document';

const photo = {
  alt: 'Ana and Santi',
  height: 800,
  id: 'p1',
  publicId: 'framed-by-santi/posts/p1',
  width: 1200,
};

describe('congratulationToDocument', () => {
  it('should save exactly the fields the rules accept, with no media as null', () => {
    expect(congratulationToDocument({ from: 'Ana', message: 'Hi' }, 42)).toEqual({
      createdAt: 42,
      from: 'Ana',
      media: null,
      message: 'Hi',
    });
  });

  it('should keep the media as it is', () => {
    const media = { kind: 'youtube' as const, video: 'dQw4w9WgXcQ' };

    expect(congratulationToDocument({ from: 'Ana', media, message: 'Hi' }, 42).media).toEqual(
      media
    );
  });
});

describe('congratulationFromDocument', () => {
  it('should read a saved message with each kind of media', () => {
    expect(
      congratulationFromDocument('c1', { createdAt: 1, from: 'Ana', media: null, message: 'Hi' })
    ).toEqual({ createdAt: 1, from: 'Ana', id: 'c1', message: 'Hi' });

    for (const media of [
      { kind: 'photo', photo },
      { kind: 'youtube', video: 'dQw4w9WgXcQ' },
      { kind: 'cloudinary', publicId: 'framed-by-santi/posts/v1' },
    ]) {
      expect(
        congratulationFromDocument('c1', { createdAt: 1, from: 'Ana', media, message: 'Hi' })?.media
      ).toEqual(media);
    }
  });

  it('should keep the words when the media is not one it knows', () => {
    const read = congratulationFromDocument('c1', {
      createdAt: 1,
      from: 'Ana',
      media: { kind: 'vimeo', video: '1' },
      message: 'Hi',
    });

    expect(read).toEqual({ createdAt: 1, from: 'Ana', id: 'c1', message: 'Hi' });
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
