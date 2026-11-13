/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Route, Routes } from '@angular/router';
import { StarterLayout } from './starter-layout';

export const route: Route = {
  path: '',
  component: StarterLayout,
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./pages/get-started/get-started.component').then(m => m.GetStartedComponent),
      pathMatch: 'full',
    },
    {
      path: 'forms',
      loadComponent: () => import('./pages/forms/forms.component').then(m => m.FormsComponent),
    },
    {
      path: 'charts',
      loadComponent: () => import('./pages/charts/charts.component').then(m => m.ChartsComponent),
    },
    {
      path: 'grids',
      loadComponent: () => import('./pages/grids/grids.component').then(m => m.GridsComponent),
    },
    { path: '**', redirectTo: '' },
  ],
};

export const routes: Routes = [route, { path: '**', redirectTo: '' }];
