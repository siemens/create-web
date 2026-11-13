/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { App } from '../../app';
import { routes } from '../../app.routes';

beforeEach(async () => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(routes)],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.autoDetectChanges();
  await TestBed.inject(Router).navigateByUrl('/');
  fixture.detectChanges();
  await fixture.whenStable();
});

afterEach(async () => {
  TestBed.resetTestingModule();
  await page.viewport(1280, 800);
});

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
  await page.getByRole('link', { name: 'Blank', exact: true }).click();
  await expect.element(page.getByRole('main')).toHaveTextContent(/^$/);
  await expect.element(page.getByRole('main')).toBeInTheDocument();
  expect(TestBed.inject(Router).url).toBe('/blank');
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});

test('keeps Starter page navigation within its preview', async () => {
  await page.getByRole('link', { name: 'Starter', exact: true }).click();
  await page.getByLabelText('Navigate to Forms page').click();
  await expect
    .element(page.getByRole('button', { name: 'Save inspection assignment' }))
    .toBeVisible();
  expect(TestBed.inject(Router).url).toBe('/starter/forms');
  expect(document.querySelector('ix-menu')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Overview', { exact: true })).not.toBeInTheDocument();
});
