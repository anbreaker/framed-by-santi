import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { AdminSessionStore } from '../store/admin-session.store';
import { AuthStore } from '../store/auth.store';
import { ownerGuard } from './owner.guard';

function runGuard(
  isAdmin: boolean,
  isOwner: boolean
): Promise<boolean | ReturnType<Router['parseUrl']>> {
  const whenReady = vi.fn(() => Promise.resolve());
  const auth = {
    isAdmin: signal(isAdmin).asReadonly(),
    isOwner: signal(isOwner).asReadonly(),
    whenReady,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AdminSessionStore, useValue: { load: () => Promise.resolve(auth) } },
      { provide: AuthStore, useValue: auth },
    ],
  });

  return TestBed.runInInjectionContext(
    () =>
      ownerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<
        boolean | ReturnType<Router['parseUrl']>
      >
  );
}

const target = (result: boolean | ReturnType<Router['parseUrl']>): string =>
  TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>);

describe('ownerGuard', () => {
  it('should let the owner in', async () => {
    expect(await runGuard(true, true)).toBe(true);
  });

  it('should send an admin who is not the owner to the congratulations they can read', async () => {
    expect(target(await runGuard(true, false))).toBe('/admin/congratulations');
  });

  it('should send everybody else to the sign-in page', async () => {
    expect(target(await runGuard(false, false))).toBe('/admin');
  });
});
