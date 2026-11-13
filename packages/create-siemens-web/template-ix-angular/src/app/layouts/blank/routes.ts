/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Route, Routes } from '@angular/router';
import { BlankLayout } from './blank-layout';
import { HomeComponent } from './pages/home/home.component';

export const route: Route = {
  path: '',
  component: BlankLayout,
  children: [
    { path: '', component: HomeComponent, pathMatch: 'full' },
    { path: '**', redirectTo: '' },
  ],
};

export const routes: Routes = [route, { path: '**', redirectTo: '' }];
