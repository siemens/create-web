/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';
import { StarterLayout } from './starter-layout';
import { ChartsComponent } from './pages/charts/charts.component';
import { FormsComponent } from './pages/forms/forms.component';
import { GetStartedComponent } from './pages/get-started/get-started.component';
import { GridsComponent } from './pages/grids/grids.component';
import './setup';

export const createRoutes = (path = ''): Routes => [
  {
    path,
    component: StarterLayout,
    children: [
      { path: '', component: GetStartedComponent, pathMatch: 'full' },
      { path: 'forms', component: FormsComponent },
      { path: 'charts', component: ChartsComponent },
      { path: 'grids', component: GridsComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];
