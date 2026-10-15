import { Routes } from '@angular/router';

import { adminGuard } from '@features/auth/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: async () => (await import('@pages/home/home.page')).HomePageComponent,
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
      (await import('@pages/admin-dashboard/admin-dashboard.page')).AdminDashboardPageComponent,
  },
  { path: '**', redirectTo: '' },
];
