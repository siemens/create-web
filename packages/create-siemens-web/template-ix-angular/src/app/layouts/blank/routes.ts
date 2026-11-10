/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Routes } from '@angular/router';
import { BlankLayout } from './blank-layout';
import { HomeComponent } from './pages/home/home.component';

export const createRoutes = (path = ''): Routes => [
  {
    path,
    component: BlankLayout,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full' },
      { path: '**', redirectTo: '' },
    ],
  },
];
