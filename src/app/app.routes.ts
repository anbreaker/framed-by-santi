import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: async () => (await import('@pages/home/home.page')).HomePageComponent,
  },
  { path: '**', redirectTo: '' },
];
