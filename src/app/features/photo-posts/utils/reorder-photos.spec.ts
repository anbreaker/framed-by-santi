import { Photo } from '../models/photo.model';
import { makeCover, movePhoto } from './reorder-photos';

const photos: readonly Photo[] = ['a', 'b', 'c'].map((id) => ({
  alt: id,
  height: 1,
  id,
  width: 1,
}));
const ids = (list: readonly Photo[]): string[] => list.map((photo) => photo.id);

describe('movePhoto', () => {
  it('should move a photo forward and backward without touching the input', () => {
    expect(ids(movePhoto(photos, 0, 2))).toEqual(['b', 'c', 'a']);
    expect(ids(movePhoto(photos, 2, 0))).toEqual(['c', 'a', 'b']);
    expect(ids(photos)).toEqual(['a', 'b', 'c']);
  });

  it('should return the same order when the move is out of range or does nothing', () => {
    expect(ids(movePhoto(photos, 1, 1))).toEqual(['a', 'b', 'c']);
    expect(ids(movePhoto(photos, 0, 3))).toEqual(['a', 'b', 'c']);
    expect(ids(movePhoto(photos, -1, 1))).toEqual(['a', 'b', 'c']);
  });
});

describe('makeCover', () => {
  it('should put the chosen photo first and keep the rest in order', () => {
    expect(ids(makeCover(photos, 2))).toEqual(['c', 'a', 'b']);
  });
});
