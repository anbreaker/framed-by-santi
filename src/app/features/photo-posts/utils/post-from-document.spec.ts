import { toPhotoPost } from './post-from-document';

const photo = { alt: 'Alt', height: 800, id: 'a/01', width: 1200 };
const valid = {
  caption: 'Cyclist',
  hashtags: ['street', 'nyc'],
  hidden: false,
  photos: [photo, { ...photo, id: 'a/02', title: 'Second', description: 'Note' }],
  tags: ['street', 'bw'],
  takenAt: '2026-10-02',
};

describe('toPhotoPost', () => {
  it('should map a valid document using the document id', () => {
    const post = toPhotoPost('post-9', { ...valid, description: 'Set text' });

    expect(post).toEqual({
      caption: 'Cyclist',
      description: 'Set text',
      hashtags: ['street', 'nyc'],
      id: 'post-9',
      photos: valid.photos,
      tags: ['street', 'bw'],
      takenAt: '2026-10-02',
    });
  });

  it('should read translated caption and description, and keep plain texts from older posts', () => {
    const caption = { en: 'Cyclist', es: 'Ciclista', pt: 'Ciclista PT' };
    const description = { en: 'Set', es: 'Serie', pt: 'Série' };

    expect(toPhotoPost('p', { ...valid, caption, description })).toMatchObject({
      caption,
      description,
    });
    expect(toPhotoPost('p', { ...valid, caption: 'Plain' })?.caption).toBe('Plain');
  });

  it('should reject a caption that is not a text or misses a language, and drop a broken description', () => {
    expect(toPhotoPost('p', { ...valid, caption: { en: 'Only English' } })).toBeNull();
    expect(toPhotoPost('p', { ...valid, caption: 42 })).toBeNull();
    expect(toPhotoPost('p', { ...valid, description: { en: 'x' } })).not.toHaveProperty(
      'description'
    );
  });

  it('should drop unknown tags and non-string hashtags instead of failing', () => {
    const post = toPhotoPost('p', { ...valid, hashtags: ['ok', 3], tags: ['street', 'made-up'] });

    expect(post?.tags).toEqual(['street']);
    expect(post?.hashtags).toEqual(['ok']);
  });

  it('should leave the optional fields out when they are missing', () => {
    const post = toPhotoPost('p', {
      caption: 'C',
      photos: [photo],
      tags: [],
      takenAt: '2026-01-01',
    });

    expect(post).not.toHaveProperty('description');
    expect(post).not.toHaveProperty('hashtags');
  });

  it('should keep the Cloudinary public id of uploaded photos', () => {
    const post = toPhotoPost('p', {
      ...valid,
      photos: [{ ...photo, publicId: 'framed-by-santi/posts/x' }],
    });

    expect(post?.photos[0].publicId).toBe('framed-by-santi/posts/x');
  });

  it('should reject documents that cannot be shown', () => {
    expect(toPhotoPost('p', null)).toBeNull();
    expect(toPhotoPost('p', 'text')).toBeNull();
    expect(toPhotoPost('p', { ...valid, caption: 5 })).toBeNull();
    expect(toPhotoPost('p', { ...valid, takenAt: 'yesterday' })).toBeNull();
    expect(toPhotoPost('p', { ...valid, photos: [] })).toBeNull();
    expect(toPhotoPost('p', { ...valid, photos: [{ ...photo, width: 0 }] })).toBeNull();
    expect(toPhotoPost('p', { ...valid, photos: [{ id: 'x' }] })).toBeNull();
  });
});
