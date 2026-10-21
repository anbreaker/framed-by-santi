import { slideMedia } from './slide-media';

const config = { cloudName: 'demo', publicIdPrefix: '' };

describe('slideMedia', () => {
  it('should keep a photo as it is', () => {
    const photo = {
      alt: 'Ana and Santi',
      kind: 'photo' as const,
      src: '/assets/congratulations/ana.webp',
    };

    expect(slideMedia(photo, config)).toEqual(photo);
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
