/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';

import { BlankLayout } from './blank-layout';
import { Home } from './pages/home/home';

export const createRoutes = (path = 'main'): Routes => [
  {
    path,
    component: BlankLayout,
    children: [
      { path: 'home', component: Home },
      { path: '**', redirectTo: 'home' }
    ]
  }
];
