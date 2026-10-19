export class TimeoutError extends Error {
  constructor() {
    super('timed out');
    this.name = 'TimeoutError';
  }
}

/** The answer of `work`, or a TimeoutError when it has not come after `ms`; `work` itself is not cancelled. */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });

  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
