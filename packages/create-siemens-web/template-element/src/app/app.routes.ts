/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';

import { route as starterRoute } from './layouts/starter/routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'main' },
  starterRoute,
  { path: '**', redirectTo: 'main' }
];
