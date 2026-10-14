/** Moves through a set one photo at a time and stops at both ends, like a film strip. */
export function stepIndex(current: number, total: number, direction: -1 | 1): number {
  return Math.min(Math.max(current + direction, 0), Math.max(total - 1, 0));
}
