/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import type { RouteRecordRaw } from 'vue-router';
import Overview from './layouts/overview/Overview.vue';
import { createRoutes as createBlankRoutes } from './layouts/blank/routes';
import { createRoutes as createStarterRoutes } from './layouts/starter/routes';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'overview',
    component: Overview,
  },
  ...createBlankRoutes('/blank'),
  ...createStarterRoutes('/starter'),
  { path: '/:pathMatch(.*)*', redirect: { name: 'overview', params: {} } },
];
