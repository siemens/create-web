/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Route, Routes } from '@angular/router';
import { provideSiDatatableConfig } from '@siemens/element-ng/datatable';

import { StarterLayout } from './starter-layout';

export const route: Route = {
  path: 'main',
  component: StarterLayout,
  providers: [provideSiDatatableConfig()],
  children: [
    { path: 'charts', loadComponent: () => import('./pages/charts/charts').then(m => m.Charts) },
    { path: 'forms', loadComponent: () => import('./pages/forms/forms').then(m => m.Forms) },
    {
      path: 'get-started',
      loadComponent: () => import('./pages/get-started/get-started').then(m => m.GetStarted)
    },
    { path: 'grids', loadComponent: () => import('./pages/grids/grids').then(m => m.Grids) },
    { path: '**', redirectTo: 'get-started' }
  ]
};

export const routes: Routes = [route, { path: '**', redirectTo: 'main' }];
