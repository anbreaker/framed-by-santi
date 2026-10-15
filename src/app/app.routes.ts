import { Routes } from '@angular/router';

import { adminGuard } from '@features/auth/guards/admin.guard';
import { HomePageComponent } from '@pages/home/home.page';

export const routes: Routes = [
  {
    path: '',
    // Most visitors open the home page first: shipping it in the main bundle saves a round trip.
    component: HomePageComponent,
  },
  {
    path: 'gallery',
    loadComponent: async () => (await import('@pages/gallery/gallery.page')).GalleryPageComponent,
  },
  {
    path: 'gallery/:postId',
    loadComponent: async () =>
      (await import('@pages/post-viewer/post-viewer.page')).PostViewerPageComponent,
  },
  {
    path: 'about',
    loadComponent: async () => (await import('@pages/about/about.page')).AboutPageComponent,
  },
  {
    path: 'admin',
    loadComponent: async () =>
      (await import('@pages/admin-login/admin-login.page')).AdminLoginPageComponent,
  },
  {
    path: 'admin/dashboard',
    canActivate: [adminGuard],
    loadComponent: async () =>
      (await import('@pages/admin-library/admin-library.page')).AdminLibraryPageComponent,
  },
  {
    path: 'admin/sets/new',
    canActivate: [adminGuard],
    loadComponent: async () =>
      (await import('@pages/admin-set/admin-set.page')).AdminSetPageComponent,
  },
  {
    path: 'admin/sets/:id',
    canActivate: [adminGuard],
    loadComponent: async () =>
      (await import('@pages/admin-set/admin-set.page')).AdminSetPageComponent,
  },
  {
    path: '**',
    loadComponent: async () =>
      (await import('@pages/not-found/not-found.page')).NotFoundPageComponent,
  },
];
