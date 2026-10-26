import { mediaThumbnail } from './media-thumbnail';

const config = { cloudName: 'demo', publicIdPrefix: '' };
const photo = { alt: '', height: 600, id: 'p1', publicId: 'posts/p1', width: 900 };

describe('mediaThumbnail', () => {
  it('should show a small version of the first photo', () => {
    expect(
      mediaThumbnail(
        [
          { kind: 'photo', photo },
          { kind: 'photo', photo: { ...photo, publicId: 'posts/p2' } },
        ],
        config
      )
    ).toBe('https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_480/posts/p1');
  });

  it('should show the YouTube thumbnail of a video', () => {
    expect(mediaThumbnail([{ kind: 'youtube', video: 'dQw4w9WgXcQ' }], config)).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('should show the first frame of a Cloudinary video', () => {
    expect(mediaThumbnail([{ kind: 'cloudinary', publicId: 'posts/v1' }], config)).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,w_1200/posts/v1.jpg'
    );
  });

  it('should skip a video link with no thumbnail and use the next item', () => {
    expect(
      mediaThumbnail(
        [
          { kind: 'youtube', video: 'not a video' },
          { kind: 'photo', photo },
        ],
        config
      )
    ).toBe('https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_480/posts/p1');
  });

  it('should have no image for a message alone', () => {
    expect(mediaThumbnail([], config)).toBeNull();
  });
});
