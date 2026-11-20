/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { afterEach, beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createMemoryHistory, createRouter } from 'vue-router';
import { render } from 'vitest-browser-vue';
import '@siemens/ix/dist/siemens-ix/siemens-ix.css';
import '../../../styles/global.css';
import App from '../../../App.vue';
import { routes } from '../../app.routes';

beforeEach(async () => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push('/');
  await router.isReady();
  await render(App, { global: { plugins: [router] } });
});

afterEach(() => page.viewport(1280, 800));

test('renders a header-only overview without a navigation gutter', async () => {
  const main = page.getByRole('main');
  await expect.element(page.getByRole('heading', { name: 'Template overview' })).toBeVisible();
  await expect.element(main).toBeVisible();
  const header = document.querySelector('ix-application-header')!;
  await expect.element(header).toBeVisible();
  expect(header.querySelector('[slot="logo"]')).toBeInTheDocument();
  expect(header.querySelector('ix-avatar')).toBeInTheDocument();
  for (const width of [1280, 768, 375]) {
    await page.viewport(width, 800);
    expect(header.shadowRoot?.querySelector('ix-menu-expand-icon')).not.toBeInTheDocument();
    expect(document.querySelector('ix-application')).not.toBeInTheDocument();
    expect(document.querySelector('ix-menu')).not.toBeInTheDocument();
    await expect
      .poll(() => main.element().getBoundingClientRect().left)
      .toBeCloseTo(header.parentElement!.getBoundingClientRect().left, 0);
    await expect
      .poll(() => main.element().getBoundingClientRect().width)
      .toBeCloseTo(header.parentElement!.getBoundingClientRect().width, 0);
  }
});

test('previews Blank without an Overview menu entry', async () => {
  await expect.element(page.getByRole('heading', { name: 'Template overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Blank', exact: true }).click();
  await expect.poll(() => document.getElementById('main-content')?.textContent?.trim()).toBe('');
  await expect.element(page.getByRole('main')).toBeInTheDocument();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});

test('keeps Starter page navigation within its preview', async () => {
  await page.getByRole('link', { name: 'Starter', exact: true }).click();
  await page.getByLabelText('Navigate to Forms page').click();
  await expect
    .element(page.getByRole('button', { name: 'Save inspection assignment' }))
    .toBeVisible();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});
