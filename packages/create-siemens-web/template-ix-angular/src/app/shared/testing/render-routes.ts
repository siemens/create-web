/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { App } from '../../app';

export const renderRoutes = async (routes: Routes, path = '/') => {
  document.documentElement.setAttribute('data-ix-theme', 'classic');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter(routes)],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  fixture.autoDetectChanges();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(path);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, router };
};
