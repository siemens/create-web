/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import '@siemens/ix/css/default.css';
import '@siemens/ix/css/legacy.css';
import './styles/global.css';
import App from './App.vue';
import { routes } from './app/app.routes';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

createApp(App).use(router).mount('#app');
