/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';
import { provideSiDatatableConfig } from '@siemens/element-ng/datatable';

import { Charts } from './pages/charts/charts';
import { Forms } from './pages/forms/forms';
import { GetStarted } from './pages/get-started/get-started';
import { Grids } from './pages/grids/grids';
import { StarterLayout } from './starter-layout';

export const createRoutes = (path = 'main'): Routes => [
  {
    path,
    component: StarterLayout,
    providers: [provideSiDatatableConfig()],
    children: [
      { path: 'charts', component: Charts },
      { path: 'forms', component: Forms },
      { path: 'get-started', component: GetStarted },
      { path: 'grids', component: Grids },
      { path: '**', redirectTo: 'get-started' }
    ]
  }
];
