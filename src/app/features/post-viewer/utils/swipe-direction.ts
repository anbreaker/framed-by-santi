export type SwipeDirection = 'next' | 'previous' | null;

export const SWIPE_THRESHOLD_PX = 48;

/** A horizontal drag to the left asks for the next photo, to the right for the previous one. */
export function swipeDirection(startX: number, endX: number): SwipeDirection {
  const distance = endX - startX;

  if (Math.abs(distance) < SWIPE_THRESHOLD_PX) return null;

  return distance < 0 ? 'next' : 'previous';
}
