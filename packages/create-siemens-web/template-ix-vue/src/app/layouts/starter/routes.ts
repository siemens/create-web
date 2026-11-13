/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import type { RouteRecordRaw } from 'vue-router';
import StarterLayout from './StarterLayout.vue';
import Charts from './pages/charts/ChartsPage.vue';
import Forms from './pages/forms/FormsPage.vue';
import GetStarted from './pages/get-started/GetStarted.vue';
import Grids from './pages/grids/GridsPage.vue';
import './setup';

export const route: RouteRecordRaw = {
  path: '/',
  component: StarterLayout,
  children: [
    { path: '', name: 'starter-home', component: GetStarted },
    { path: 'forms', name: 'starter-forms', component: Forms },
    { path: 'charts', name: 'starter-charts', component: Charts },
    { path: 'grids', name: 'starter-grids', component: Grids },
    { path: ':pathMatch(.*)*', redirect: { name: 'starter-home', params: {} } },
  ],
};

export const routes: RouteRecordRaw[] = [route];
