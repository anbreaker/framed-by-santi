import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { AuthStore } from '../store/auth.store';
import { adminGuard } from './admin.guard';

function runGuard(isAdmin: boolean): Promise<boolean | ReturnType<Router['parseUrl']>> {
  const whenReady = vi.fn(() => Promise.resolve());
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { isAdmin: signal(isAdmin).asReadonly(), whenReady } },
    ],
  });

  return TestBed.runInInjectionContext(
    () =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<
        boolean | ReturnType<Router['parseUrl']>
      >
  );
}

describe('adminGuard', () => {
  it('should let an admin in', async () => {
    expect(await runGuard(true)).toBe(true);
  });

  it('should send everybody else to the home page', async () => {
    const result = await runGuard(false);

    expect(result).not.toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>)).toBe('/');
  });
});
