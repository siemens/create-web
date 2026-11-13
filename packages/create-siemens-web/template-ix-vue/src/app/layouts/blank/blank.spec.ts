/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { beforeEach, expect, test } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { render } from 'vitest-browser-vue';
import '@siemens/ix/dist/siemens-ix/siemens-ix.css';
import '../../../styles/global.css';
import App from '../../../App.vue';
import { routes } from './routes';

beforeEach(() => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
});

test.each(['/', '/missing'])('renders the shell with an empty main page at %s', async path => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const { getByRole, getByText } = await render(App, { global: { plugins: [router] } });

  await expect.element(getByText('Home', { exact: true })).toBeInTheDocument();
  await expect.element(getByRole('main')).toBeInTheDocument();
  await expect.element(document.getElementById('main-content')).toHaveTextContent(/^$/);
});
