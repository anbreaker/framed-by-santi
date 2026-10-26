import { slideMedia } from './slide-media';

const config = { cloudName: 'demo', publicIdPrefix: '' };

describe('slideMedia', () => {
  it('should deliver every uploaded photo from Cloudinary in order, with the widths each has', () => {
    const photo = {
      alt: 'Ana and Santi',
      height: 600,
      id: 'p1',
      publicId: 'framed-by-santi/posts/p1',
      width: 900,
    };

    const small = {
      alt: '',
      height: 300,
      id: 'p2',
      publicId: 'framed-by-santi/posts/p2',
      width: 400,
    };

    expect(slideMedia({ kind: 'photo', photos: [photo, small] }, config)).toEqual({
      kind: 'photo',
      photos: [
        {
          alt: 'Ana and Santi',
          src: 'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_1600/framed-by-santi/posts/p1',
          srcset:
            'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_480/framed-by-santi/posts/p1 480w, https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_800/framed-by-santi/posts/p1 800w, https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_900/framed-by-santi/posts/p1 900w',
        },
        {
          alt: '',
          src: 'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_1600/framed-by-santi/posts/p2',
          srcset:
            'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_400/framed-by-santi/posts/p2 400w',
        },
      ],
    });
  });

  it('should turn a YouTube link into its thumbnail and the player it opens', () => {
    expect(slideMedia({ kind: 'youtube', video: 'https://youtu.be/dQw4w9WgXcQ' }, config)).toEqual({
      kind: 'video',
      video: {
        embedUrl:
          'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1',
        kind: 'youtube',
        poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      },
    });
  });

  it('should turn a Cloudinary video into its first frame and the file it plays', () => {
    expect(slideMedia({ kind: 'cloudinary', publicId: 'congratulations/ana' }, config)).toEqual({
      kind: 'video',
      video: {
        fileUrl: 'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/congratulations/ana',
        kind: 'file',
        poster:
          'https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,w_1200/congratulations/ana.jpg',
      },
    });
  });

  it.each([
    ['there is no media', undefined, config],
    ['the YouTube link is not a video', { kind: 'youtube' as const, video: 'not a video' }, config],
    [
      'Cloudinary is not configured',
      { kind: 'cloudinary' as const, publicId: 'congratulations/ana' },
      { ...config, cloudName: '' },
    ],
  ])('should show only the text when %s', (_case, media, cloudinary) => {
    expect(slideMedia(media, cloudinary)).toEqual({ kind: 'text' });
  });
});
