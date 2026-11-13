/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideMissingTranslationHandlerForElement } from '@siemens/element-translate-ng/ngx-translate';
import { page } from 'vitest/browser';

import { BlankLayout } from './blank-layout';

describe('BlankLayout', () => {
  let fixture: ComponentFixture<BlankLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslateService({
          missingTranslationHandler: provideMissingTranslationHandlerForElement()
        })
      ]
    }).compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(BlankLayout);
    await fixture.whenStable();
  });

  it('should have a accounts button', async () => {
    await expect.element(page.getByRole('button', { name: /User account/ })).toBeInTheDocument();
  });
});
