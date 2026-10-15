import { buildPost, todayIso } from './post-draft';

const photo = {
  alt: '',
  height: 800,
  id: 'framed-by-santi/posts/a',
  publicId: 'framed-by-santi/posts/a',
  width: 1200,
};

describe('todayIso', () => {
  it('should format the local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});

describe('buildPost', () => {
  const draft = {
    caption: { en: '  Cyclist ', es: 'Ciclista', pt: '' },
    description: { en: '  ', es: '', pt: '' },
    photos: [photo],
    tags: ['street'],
    takenAt: '2026-10-02',
  };

  it('should trim every language and reuse the first caption as alt text of photos without one', () => {
    expect(buildPost(draft)).toEqual({
      caption: { en: 'Cyclist', es: 'Ciclista', pt: '' },
      id: '',
      photos: [{ ...photo, alt: 'Cyclist' }],
      tags: ['street'],
      takenAt: '2026-10-02',
    });
  });

  it('should take the alt text from the first language that has a caption', () => {
    const post = buildPost({ ...draft, caption: { en: '', es: 'Ciclista', pt: '' } });

    expect(post.photos[0].alt).toBe('Ciclista');
  });

  it('should keep an alt text the author already wrote and a description that has some text', () => {
    const post = buildPost({
      ...draft,
      description: { en: ' Set text ', es: '', pt: '' },
      photos: [{ ...photo, alt: 'Mine' }],
    });

    expect(post.description).toEqual({ en: 'Set text', es: '', pt: '' });
    expect(post.photos[0].alt).toBe('Mine');
  });

  it('should keep the id of the post being edited', () => {
    expect(buildPost(draft, 'abc').id).toBe('abc');
  });
});
