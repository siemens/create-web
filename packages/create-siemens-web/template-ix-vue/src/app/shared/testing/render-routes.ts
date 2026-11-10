/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';
import { render } from 'vitest-browser-vue';
import '@siemens/ix/dist/siemens-ix/siemens-ix.css';
import '../../../styles/global.css';
import App from '../../../App.vue';

export const renderRoutes = async (routes: RouteRecordRaw[], path = '/') => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  return render(App, { global: { plugins: [router] } });
};
