import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' },
];
