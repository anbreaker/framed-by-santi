import { PhotoPost } from '../models/photo-post.model';
import { coverRatio } from './cover-ratio';

describe('coverRatio', () => {
  const postWithCover = (width: number, height: number): PhotoPost => ({
    caption: 'Test',
    id: 'post-test',
    photos: [
      { alt: 'cover', height, id: 'post-test/01', width },
      { alt: 'second', height: 100, id: 'post-test/02', width: 100 },
    ],
    tags: [],
    takenAt: '2026-01-01',
  });

  it('should be above one for landscape covers and below one for portrait covers', () => {
    expect(coverRatio(postWithCover(1500, 1000))).toBe(1.5);
    expect(coverRatio(postWithCover(1234, 1876))).toBe(0.658);
  });

  it('should only look at the first photo of the set', () => {
    expect(coverRatio(postWithCover(1000, 1000))).toBe(1);
  });
});
