/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Outlet, useLocation } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { routes } from '../../app.routes';
import { renderRoutes } from '../../shared/testing/render-routes';
import { routes as blankRoutes } from '../blank/routes';
import { routes as starterRoutes } from '../starter/routes';

afterEach(() => page.viewport(1280, 800));

const RouteLocation = () => {
  const location = useLocation();
  return (
    <>
      <output aria-label="Current route">{location.pathname}</output>
      <Outlet />
    </>
  );
};

test.each([
  { layout: 'Blank', routes: blankRoutes },
  { layout: 'Starter', routes: starterRoutes },
])('redirects missing $layout pages to the root', async ({ routes }) => {
  const screen = await renderRoutes(
    [{ element: <RouteLocation />, children: routes }],
    '/missing/nested',
  );
  await expect.element(screen.getByLabelText('Current route')).toHaveTextContent(/^\/$/);
});

test.each([
  { path: '/blank/missing', expectedPath: '/blank' },
  { path: '/blank/missing/nested', expectedPath: '/blank' },
  { path: '/starter/missing', expectedPath: '/starter' },
  { path: '/starter/missing/nested', expectedPath: '/starter' },
])('redirects $path to its layout at $expectedPath', async ({ path, expectedPath }) => {
  const screen = await renderRoutes([{ element: <RouteLocation />, children: routes }], path);
  await expect
    .element(screen.getByLabelText('Current route'))
    .toHaveTextContent(new RegExp(`^${expectedPath}$`));
});

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
  await screen.getByRole('link', { name: 'Blank', exact: true }).click();
  await expect.poll(() => document.getElementById('main-content')?.textContent?.trim()).toBe('');
  await expect.element(screen.getByRole('main')).toBeInTheDocument();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});

test('keeps Starter page navigation within its preview', async () => {
  const screen = await renderRoutes(routes);
  await screen.getByRole('link', { name: 'Starter', exact: true }).click();
  await screen.getByLabelText('Navigate to Forms page').click();
  await expect
    .element(screen.getByRole('button', { name: 'Save inspection assignment' }))
    .toBeVisible();
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});
