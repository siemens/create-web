/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';
import { Overview } from './layouts/overview/overview';
import { createRoutes as createBlankRoutes } from './layouts/blank/routes';
import { createRoutes as createStarterRoutes } from './layouts/starter/routes';

export const routes: Routes = [
  {
    path: '',
    component: Overview,
    pathMatch: 'full',
  },
  ...createBlankRoutes('blank'),
  ...createStarterRoutes('starter'),
  { path: '**', redirectTo: '' },
];
