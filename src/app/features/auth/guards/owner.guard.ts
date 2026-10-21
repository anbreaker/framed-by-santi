import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminSessionStore } from '../store/admin-session.store';

/**
 * Lets only the owner manage the friends' messages. Another admin goes to the page where they read them;
 * everybody else goes to the sign-in page. The security rules hold the same line on every write.
 */
export const ownerGuard: CanActivateFn = async () => {
  const session = inject(AdminSessionStore);
  const router = inject(Router);

  const authStore = await session.load();
  await authStore.whenReady();

  if (authStore.isOwner()) return true;

  return router.parseUrl(authStore.isAdmin() ? '/admin/congratulations' : '/admin');
};
