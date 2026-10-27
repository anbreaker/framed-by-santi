const FALLBACK_DELAY_MS = 2000;
const IDLE_TIMEOUT_MS = 4000;

const whenIdle = (task: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return;
  }

  setTimeout(task, FALLBACK_DELAY_MS);
};

/**
 * Loads Vercel Analytics and Speed Insights after the first render, off the critical path.
 */
export const deferAnalytics = (): void => {
  whenIdle(async () => {
    const [{ inject }, { injectSpeedInsights }] = await Promise.all([
      import('@vercel/analytics'),
      import('@vercel/speed-insights'),
    ]);

    inject();
    injectSpeedInsights();
  });
};
