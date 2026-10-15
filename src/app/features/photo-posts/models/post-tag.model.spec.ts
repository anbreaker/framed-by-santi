import { isPostTag, POST_TAGS } from './post-tag.model';

describe('isPostTag', () => {
  it('should accept every known tag', () => {
    expect(POST_TAGS.every((tag) => isPostTag(tag))).toBe(true);
  });

  it('should reject unknown, empty and missing values', () => {
    expect(isPostTag('portrait')).toBe(false);
    expect(isPostTag('')).toBe(false);
    expect(isPostTag(null)).toBe(false);
    expect(isPostTag(undefined)).toBe(false);
  });
});
