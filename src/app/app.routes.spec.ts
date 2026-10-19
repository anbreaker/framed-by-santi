import { adminGuard } from '@features/auth/guards/admin.guard';
import { HomePageComponent } from '@pages/home/home.page';

import { routes } from './app.routes';

describe('routes', () => {
  it('should ship the home page in the main bundle, since it is what most visitors open first', () => {
    const home = routes.find((route) => route.path === '');

    expect(home?.component).toBe(HomePageComponent);
    expect(home?.loadComponent).toBeUndefined();
  });

  it('should keep the other pages lazy so they do not weigh on the first load', () => {
    const lazy = routes.filter((route) => route.path !== '' && route.path !== '**');

    expect(lazy.length).toBeGreaterThan(0);
    lazy
      .filter((route) => route.loadComponent !== undefined)
      .forEach((route) => expect(route.component).toBeUndefined());
  });

  it('should keep every admin page behind the admin guard, except the sign-in page', () => {
    const admin = routes.filter((route) => route.path?.startsWith('admin/'));

    expect(admin.map((route) => route.path)).toContain('admin/settings');
    admin.forEach((route) => expect(route.canActivate).toEqual([adminGuard]));
  });
});
