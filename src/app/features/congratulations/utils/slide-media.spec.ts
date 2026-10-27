import { slideItems } from './slide-media';

const config = { cloudName: 'demo', publicIdPrefix: '' };

describe('slideItems', () => {
  it('should deliver photos from Cloudinary and turn videos into their still image and player, in order', () => {
    const photo = {
      alt: 'Ana and Santi',
      height: 600,
      id: 'p1',
      publicId: 'framed-by-santi/posts/p1',
      width: 900,
    };

    expect(
      slideItems(
        [
          { kind: 'youtube', video: 'https://youtu.be/dQw4w9WgXcQ' },
          { kind: 'photo', photo },
          { kind: 'cloudinary', publicId: 'congratulations/ana' },
        ],
        config
      )
    ).toEqual([
      {
        kind: 'video',
        video: {
          embedUrl:
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1',
          kind: 'youtube',
          poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        },
      },
      {
        alt: 'Ana and Santi',
        kind: 'photo',
        photo,
        src: 'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_1600/framed-by-santi/posts/p1',
        srcset:
          'https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_480/framed-by-santi/posts/p1 480w, https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_800/framed-by-santi/posts/p1 800w, https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_900/framed-by-santi/posts/p1 900w',
      },
      {
        kind: 'video',
        video: {
          fileUrl: 'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/congratulations/ana',
          kind: 'file',
          poster:
            'https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,w_1200/congratulations/ana.jpg',
        },
      },
    ]);
  });

  it('should leave out a link that is not a YouTube video and a Cloudinary video without a cloud', () => {
    const photo = { alt: '', height: 600, id: 'p1', width: 900 };
    const media = [
      { kind: 'youtube' as const, video: 'not a video' },
      { kind: 'cloudinary' as const, publicId: 'congratulations/ana' },
      { kind: 'photo' as const, photo },
    ];

    expect(slideItems(media, { ...config, cloudName: '' }).map((item) => item.kind)).toEqual([
      'photo',
    ]);
  });

  it('should have nothing to show for words alone', () => {
    expect(slideItems([], config)).toEqual([]);
  });
});
