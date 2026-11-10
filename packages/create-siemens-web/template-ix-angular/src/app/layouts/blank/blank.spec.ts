/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { renderRoutes } from '../../shared/testing/render-routes';
import { createRoutes } from './routes';

afterEach(() => TestBed.resetTestingModule());

test.each(['/', '/missing'])('renders the shell with an empty main page at %s', async path => {
  await renderRoutes(createRoutes(), path);

  await expect.element(page.getByText('Home', { exact: true })).toBeInTheDocument();
  await expect.element(page.getByRole('main')).toBeInTheDocument();
  await expect.element(document.getElementById('main-content')).toHaveTextContent(/^$/);
});
