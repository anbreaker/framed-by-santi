import { ADMIN_HINT_KEY, hasAdminHint, setAdminHint } from './admin-hint';

describe('admin hint', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('should be absent on a browser where nobody signed in', () => {
    expect(hasAdminHint()).toBe(false);
  });

  it('should be remembered once an admin is confirmed, and forgotten when that ends', () => {
    setAdminHint(true);
    expect(hasAdminHint()).toBe(true);
    expect(localStorage.getItem(ADMIN_HINT_KEY)).not.toBeNull();

    setAdminHint(false);
    expect(hasAdminHint()).toBe(false);
    expect(localStorage.getItem(ADMIN_HINT_KEY)).toBeNull();
  });

  it('should count as absent, and never throw, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => setAdminHint(true)).not.toThrow();
    expect(hasAdminHint()).toBe(false);
  });
});
