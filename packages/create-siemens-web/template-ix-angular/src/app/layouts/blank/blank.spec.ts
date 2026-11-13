/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { App } from '../../app';
import { routes } from './routes';

beforeEach(async () => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(routes)],
  }).compileComponents();
});

afterEach(() => TestBed.resetTestingModule());

test.each(['/', '/missing'])('renders the shell with an empty main page at %s', async path => {
  const fixture = TestBed.createComponent(App);
  fixture.autoDetectChanges();
  await TestBed.inject(Router).navigateByUrl(path);
  fixture.detectChanges();
  await fixture.whenStable();

  await expect.element(page.getByText('Home', { exact: true })).toBeInTheDocument();
  await expect.element(page.getByRole('main')).toBeInTheDocument();
  await expect.element(page.getByRole('main')).toHaveTextContent(/^$/);
});
