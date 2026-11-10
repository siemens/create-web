/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { routes } from '../../app.routes';
import { renderRoutes } from '../../shared/testing/render-routes';

afterEach(() => page.viewport(1280, 800));

test('renders a header-only overview without a navigation gutter', async () => {
  const screen = await renderRoutes(routes);
  await expect.element(screen.getByRole('heading', { name: 'Template overview' })).toBeVisible();
  await expect.element(screen.getByRole('main')).toBeVisible();
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
      .poll(() => document.getElementById('main-content')!.getBoundingClientRect().left)
      .toBeCloseTo(header.parentElement!.getBoundingClientRect().left, 0);
    await expect
      .poll(() => document.getElementById('main-content')!.getBoundingClientRect().width)
      .toBeCloseTo(header.parentElement!.getBoundingClientRect().width, 0);
  }
});

test('previews Blank without an Overview menu entry', async () => {
  const screen = await renderRoutes(routes);
  await expect.element(screen.getByRole('heading', { name: 'Template overview' })).toBeVisible();
  await screen.getByRole('link', { name: 'Preview Blank' }).click();
  await expect.poll(() => document.getElementById('main-content')?.textContent?.trim()).toBe('');
  await expect.element(screen.getByRole('main')).toBeInTheDocument();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});

test('keeps Starter page navigation within its preview', async () => {
  const screen = await renderRoutes(routes);
  await screen.getByRole('link', { name: 'Preview Starter' }).click();
  await screen.getByLabelText('Navigate to Forms page').click();
  await expect
    .element(screen.getByRole('button', { name: 'Save inspection assignment' }))
    .toBeVisible();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});
