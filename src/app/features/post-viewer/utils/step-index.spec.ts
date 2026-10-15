import { stepIndex } from './step-index';

describe('stepIndex', () => {
  it('should move one photo forward or backward', () => {
    expect(stepIndex(3, 10, 1)).toBe(4);
    expect(stepIndex(3, 10, -1)).toBe(2);
  });

  it('should stop at the first and last photo instead of wrapping around', () => {
    expect(stepIndex(0, 10, -1)).toBe(0);
    expect(stepIndex(9, 10, 1)).toBe(9);
  });

  it('should stay on the only photo of a set of one', () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, 1, -1)).toBe(0);
  });
});
