import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../store/auth.store';

/** Lets admins in and sends everybody else to the home page, so the admin area stays hidden. */
export const adminGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.whenReady();

  return authStore.isAdmin() ? true : router.parseUrl('/');
};
