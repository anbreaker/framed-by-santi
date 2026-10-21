import { cloudinaryVideoPoster, cloudinaryVideoUrl } from './cloudinary-video';

const config = { cloudName: 'demo', publicIdPrefix: 'framed-by-santi/test/' };

describe('cloudinaryVideoUrl', () => {
  it('should deliver the video in the best format and quality for the browser, from its full public id', () => {
    expect(cloudinaryVideoUrl('congratulations/ana', config)).toBe(
      'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/congratulations/ana'
    );
  });

  it('should return null when Cloudinary is not configured', () => {
    expect(cloudinaryVideoUrl('congratulations/ana', { ...config, cloudName: '' })).toBeNull();
  });
});

describe('cloudinaryVideoPoster', () => {
  it('should use the first frame of the video as a still image', () => {
    expect(cloudinaryVideoPoster('congratulations/ana', config)).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0,f_auto,q_auto,w_1200/congratulations/ana.jpg'
    );
  });

  it('should return null when Cloudinary is not configured', () => {
    expect(cloudinaryVideoPoster('congratulations/ana', { ...config, cloudName: '' })).toBeNull();
  });
});
