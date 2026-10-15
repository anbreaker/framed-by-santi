import { SWIPE_THRESHOLD_PX, swipeDirection } from './swipe-direction';

describe('swipeDirection', () => {
  it('should read a drag to the left as next and to the right as previous', () => {
    expect(swipeDirection(300, 100)).toBe('next');
    expect(swipeDirection(100, 300)).toBe('previous');
  });

  it('should ignore short drags so taps and small wobbles do nothing', () => {
    expect(swipeDirection(100, 100 + SWIPE_THRESHOLD_PX - 1)).toBeNull();
    expect(swipeDirection(100, 100 - SWIPE_THRESHOLD_PX + 1)).toBeNull();
  });

  it('should react exactly at the threshold', () => {
    expect(swipeDirection(100, 100 - SWIPE_THRESHOLD_PX)).toBe('next');
  });
});
