import { buildPost, parseHashtags, todayIso } from './post-draft';

const photo = {
  alt: '',
  height: 800,
  id: 'framed-by-santi/posts/a',
  publicId: 'framed-by-santi/posts/a',
  width: 1200,
};

describe('parseHashtags', () => {
  it('should split on spaces and commas, drop the # and repeated tags', () => {
    expect(parseHashtags('#Street, nyc  #street\n#bw')).toEqual(['Street', 'nyc', 'bw']);
  });

  it('should return an empty list for blank text', () => {
    expect(parseHashtags('  # , ')).toEqual([]);
  });
});

describe('todayIso', () => {
  it('should format the local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});

describe('buildPost', () => {
  const draft = {
    caption: '  Cyclist ',
    description: '  ',
    hashtags: '#street nyc',
    photos: [photo],
    tags: ['street' as const],
    takenAt: '2026-10-02',
  };

  it('should trim texts, parse hashtags and reuse the caption as alt text of photos without one', () => {
    expect(buildPost(draft)).toEqual({
      caption: 'Cyclist',
      hashtags: ['street', 'nyc'],
      id: '',
      photos: [{ ...photo, alt: 'Cyclist' }],
      tags: ['street'],
      takenAt: '2026-10-02',
    });
  });

  it('should keep an alt text the author already wrote and a non-empty description', () => {
    const post = buildPost({
      ...draft,
      description: ' Set text ',
      photos: [{ ...photo, alt: 'Mine' }],
    });

    expect(post.description).toBe('Set text');
    expect(post.photos[0].alt).toBe('Mine');
  });

  it('should keep the id of the post being edited', () => {
    expect(buildPost(draft, 'abc').id).toBe('abc');
  });
});
