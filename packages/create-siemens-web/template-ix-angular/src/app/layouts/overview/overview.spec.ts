/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { routes } from '../../app.routes';
import { renderRoutes } from '../../shared/testing/render-routes';

afterEach(async () => {
  TestBed.resetTestingModule();
  await page.viewport(1280, 800);
});

test('renders a header-only overview without a navigation gutter', async () => {
  await renderRoutes(routes);
  await expect.element(page.getByRole('heading', { name: 'Template overview' })).toBeVisible();
  await expect.element(page.getByRole('main')).toBeVisible();
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
  const { router } = await renderRoutes(routes);
  await page.getByRole('link', { name: 'Preview Blank' }).click();
  await expect.poll(() => document.getElementById('main-content')?.textContent?.trim()).toBe('');
  await expect.element(page.getByRole('main')).toBeInTheDocument();
  expect(router.url).toBe('/blank');
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});

test('keeps Starter page navigation within its preview', async () => {
  const { router } = await renderRoutes(routes);
  await page.getByRole('link', { name: 'Preview Starter' }).click();
  await page.getByLabelText('Navigate to Forms page').click();
  await expect
    .element(page.getByRole('button', { name: 'Save inspection assignment' }))
    .toBeVisible();
  expect(router.url).toBe('/starter/forms');
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});
