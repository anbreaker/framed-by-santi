const inject = vi.fn();
const injectSpeedInsights = vi.fn();

vi.mock('@vercel/analytics', () => ({ inject }));
vi.mock('@vercel/speed-insights', () => ({ injectSpeedInsights }));

import { deferAnalytics } from './defer-analytics';

describe('deferAnalytics', () => {
  beforeEach(() => {
    inject.mockClear();
    injectSpeedInsights.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should not load analytics until the browser is idle', () => {
    const requestIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);

    deferAnalytics();

    expect(requestIdleCallback).toHaveBeenCalledOnce();
    expect(inject).not.toHaveBeenCalled();
    expect(injectSpeedInsights).not.toHaveBeenCalled();
  });

  it('should inject analytics and speed insights once idle', async () => {
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => callback());

    deferAnalytics();

    await vi.waitFor(() => {
      expect(inject).toHaveBeenCalledOnce();
      expect(injectSpeedInsights).toHaveBeenCalledOnce();
    });
  });

  it('should fall back to a timeout when requestIdleCallback is unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);

    deferAnalytics();
    expect(inject).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(inject).toHaveBeenCalledOnce();
    expect(injectSpeedInsights).toHaveBeenCalledOnce();
  });
});
