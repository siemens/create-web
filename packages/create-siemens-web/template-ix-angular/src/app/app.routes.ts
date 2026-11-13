/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';
import { Overview } from './layouts/overview/overview';
import { route as blankRoute } from './layouts/blank/routes';
import { route as starterRoute } from './layouts/starter/routes';

export const routes: Routes = [
  {
    path: '',
    component: Overview,
    pathMatch: 'full',
  },
  { ...blankRoute, path: 'blank' },
  { ...starterRoute, path: 'starter' },
  { path: '**', redirectTo: '' },
];
