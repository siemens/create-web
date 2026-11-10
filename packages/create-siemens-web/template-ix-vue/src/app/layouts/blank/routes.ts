/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import type { RouteRecordRaw } from 'vue-router';
import BlankLayout from './BlankLayout.vue';
import Home from './pages/home/Home.vue';

export const createRoutes = (path = '/'): RouteRecordRaw[] => [
  {
    path,
    component: BlankLayout,
    children: [
      { path: '', name: 'blank-home', component: Home },
      { path: ':pathMatch(.*)*', redirect: { name: 'blank-home', params: {} } },
    ],
  },
];
