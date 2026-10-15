import { formatSetCounter } from './set-counter';

describe('formatSetCounter', () => {
  it('should pad single digits like a film counter', () => {
    expect(formatSetCounter(3, 10)).toBe('03 / 10');
  });

  it('should keep two-digit positions untouched', () => {
    expect(formatSetCounter(12, 20)).toBe('12 / 20');
  });
});
