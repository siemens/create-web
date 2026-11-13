/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import type { RouteRecordRaw } from 'vue-router';
import StarterLayout from './StarterLayout.vue';

export const route: RouteRecordRaw = {
  path: '/',
  component: StarterLayout,
  children: [
    {
      path: '',
      name: 'starter-home',
      component: () => import('./pages/get-started/GetStarted.vue'),
    },
    {
      path: 'forms',
      name: 'starter-forms',
      component: () => import('./pages/forms/FormsPage.vue'),
    },
    {
      path: 'charts',
      name: 'starter-charts',
      component: () => import('./pages/charts/ChartsPage.vue'),
    },
    {
      path: 'grids',
      name: 'starter-grids',
      component: () => import('./pages/grids/GridsPage.vue'),
    },
    { path: ':pathMatch(.*)*', redirect: { name: 'starter-home', params: {} } },
  ],
};

export const routes: RouteRecordRaw[] = [route];
