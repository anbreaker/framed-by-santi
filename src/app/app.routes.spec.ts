import { adminGuard } from '@features/auth/guards/admin.guard';
import { ownerGuard } from '@features/auth/guards/owner.guard';
import { HomePageComponent } from '@pages/home/home.page';

import { routes } from './app.routes';

const OWNER_PATH = 'admin/congratulations/manage';

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

  it('should keep every admin page behind the admin guard, except the sign-in page and the owner page', () => {
    const admin = routes.filter(
      (route) => route.path?.startsWith('admin/') && route.path !== OWNER_PATH
    );

    expect(admin.map((route) => route.path)).toContain('admin/settings');
    expect(admin.map((route) => route.path)).toContain('admin/congratulations');
    admin.forEach((route) => expect(route.canActivate).toEqual([adminGuard]));
  });

  it('should keep managing the congratulations behind the owner guard', () => {
    const manage = routes.find((route) => route.path === OWNER_PATH);

    expect(manage?.canActivate).toEqual([ownerGuard]);
  });
});
