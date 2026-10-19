import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminSessionStore } from '../store/admin-session.store';

/** Lets admins in and sends everybody else to the sign-in page; auth is loaded here, not upfront. */
export const adminGuard: CanActivateFn = async () => {
  const session = inject(AdminSessionStore);
  const router = inject(Router);

  const authStore = await session.load();
  await authStore.whenReady();

  return authStore.isAdmin() ? true : router.parseUrl('/admin');
};
