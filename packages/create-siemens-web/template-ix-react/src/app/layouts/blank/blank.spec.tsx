/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { expect, test } from 'vitest';
import { renderRoutes } from '../../shared/testing/render-routes';
import { routes } from './routes';

test.each(['/', '/missing'])('renders the shell with an empty main page at %s', async path => {
  const { getByRole, getByText } = await renderRoutes(routes, path);

  await expect.element(getByText('Home', { exact: true })).toBeInTheDocument();
  await expect.element(getByRole('main')).toBeInTheDocument();
  await expect.element(document.getElementById('main-content')).toHaveTextContent(/^$/);
});
