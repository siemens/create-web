/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Route, Routes } from '@angular/router';

import { BlankLayout } from './blank-layout';
import { Home } from './pages/home/home';

export const route: Route = {
  path: 'main',
  component: BlankLayout,
  children: [
    { path: 'home', component: Home },
    { path: '**', redirectTo: 'home' }
  ]
};

export const routes: Routes = [route, { path: '**', redirectTo: 'main' }];
