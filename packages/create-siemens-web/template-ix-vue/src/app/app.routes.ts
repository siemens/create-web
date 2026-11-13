/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import type { RouteRecordRaw } from 'vue-router';
import Overview from './layouts/overview/Overview.vue';
import { route as blankRoute } from './layouts/blank/routes';
import { route as starterRoute } from './layouts/starter/routes';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'overview',
    component: Overview,
  },
  { ...blankRoute, path: '/blank' },
  { ...starterRoute, path: '/starter' },
  { path: '/:pathMatch(.*)*', redirect: { name: 'overview', params: {} } },
];
