import { PhotoPost } from '../models/photo-post.model';
import { toPhotoPost } from './post-from-document';
import { toPostDocument } from './post-to-document';

const post: PhotoPost = {
  caption: 'Cyclist',
  description: 'Set text',
  id: 'ignored-by-the-document',
  photos: [
    {
      alt: 'One',
      height: 800,
      id: 'framed-by-santi/posts/a',
      publicId: 'framed-by-santi/posts/a',
      width: 1200,
    },
    { alt: 'Two', height: 800, id: 'framed-by-santi/posts/b', title: 'Second', width: 1200 },
  ],
  tags: ['street'],
  takenAt: '2026-10-02',
};

describe('toPostDocument', () => {
  it('should write the visibility next to the post fields and leave the id out', () => {
    const document = toPostDocument(post, { hidden: true });

    expect(document).toEqual({
      caption: 'Cyclist',
      description: 'Set text',
      hidden: true,
      photos: post.photos,
      tags: ['street'],
      takenAt: '2026-10-02',
    });
    expect('id' in document).toBe(false);
  });

  it('should leave the optional fields out instead of writing undefined, which Firestore rejects', () => {
    const document = toPostDocument(
      {
        ...post,
        description: undefined,
        photos: [{ alt: '', height: 1, id: 'x', width: 1 }],
      },
      { hidden: false }
    );

    expect(Object.values(document)).not.toContain(undefined);
    expect(document['photos']).toEqual([{ alt: '', height: 1, id: 'x', width: 1 }]);
    expect('description' in document).toBe(false);
  });

  it('should round-trip through the reader the public site uses', () => {
    expect(toPhotoPost(post.id, toPostDocument(post, { hidden: false }))).toEqual(post);
  });

  it('should round-trip translated texts', () => {
    const translated: PhotoPost = {
      ...post,
      caption: { en: 'Cyclist', es: 'Ciclista', pt: 'Ciclista PT' },
      description: { en: 'Set', es: 'Serie', pt: 'Série' },
    };

    expect(toPhotoPost(post.id, toPostDocument(translated, { hidden: false }))).toEqual(translated);
  });
});
