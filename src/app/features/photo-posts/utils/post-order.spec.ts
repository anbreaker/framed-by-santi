import { PhotoPost } from '../models/photo-post.model';
import { byNewest } from './post-order';

const post = (id: string, takenAt: string, createdAt?: string): PhotoPost => ({
  caption: id,
  ...(createdAt !== undefined && { createdAt }),
  id,
  photos: [],
  tags: [],
  takenAt,
});

describe('byNewest', () => {
  it('should put the later date first', () => {
    const sorted = [post('old', '2026-01-01'), post('new', '2026-09-09')].sort(byNewest);

    expect(sorted.map((item) => item.id)).toEqual(['new', 'old']);
  });

  it('should put the set created last first when two share a day', () => {
    const sorted = [
      post('morning', '2026-10-15', '2026-10-15T08:00:00.000Z'),
      post('evening', '2026-10-15', '2026-10-15T20:00:00.000Z'),
    ].sort(byNewest);

    expect(sorted.map((item) => item.id)).toEqual(['evening', 'morning']);
  });

  it('should rank a set with a creation time above an older one without it on the same day', () => {
    const sorted = [
      post('legacy', '2026-10-15'),
      post('stamped', '2026-10-15', '2026-10-15T20:00:00.000Z'),
    ].sort(byNewest);

    expect(sorted.map((item) => item.id)).toEqual(['stamped', 'legacy']);
  });

  it('should never let the creation time beat a later date', () => {
    const sorted = [
      post('tomorrow', '2026-10-16'),
      post('today', '2026-10-15', '2026-10-15T23:00:00.000Z'),
    ].sort(byNewest);

    expect(sorted.map((item) => item.id)).toEqual(['tomorrow', 'today']);
  });
});
