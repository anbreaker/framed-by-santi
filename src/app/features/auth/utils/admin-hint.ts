export const ADMIN_HINT_KEY = 'framed-admin';

/**
 * A note left on this browser when an admin signs in, so the public pages load auth only for someone who
 * may be signed in. It grants nothing: the real check is still Firebase Auth and the admins document.
 */
export function hasAdminHint(): boolean {
  try {
    return localStorage.getItem(ADMIN_HINT_KEY) !== null;
  } catch {
    return false;
  }
}

export function setAdminHint(isAdmin: boolean): void {
  try {
    if (isAdmin) {
      localStorage.setItem(ADMIN_HINT_KEY, '1');
    } else {
      localStorage.removeItem(ADMIN_HINT_KEY);
    }
  } catch {
    // Without storage the admin just does not see the admin links on the public pages until /admin.
  }
}
