import { TimeoutError, withTimeout } from './with-timeout';

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('should give the answer when it comes in time', async () => {
    await expect(withTimeout(Promise.resolve('done'), 1000)).resolves.toBe('done');
  });

  it('should pass the failure on when it fails in time', async () => {
    await expect(withTimeout(Promise.reject(new Error('offline')), 1000)).rejects.toThrow(
      'offline'
    );
  });

  it('should fail with a TimeoutError when there is no answer in time', async () => {
    vi.useFakeTimers();
    const late = withTimeout(new Promise(() => undefined), 1000);
    const check = expect(late).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(1000);

    await check;
  });
});
