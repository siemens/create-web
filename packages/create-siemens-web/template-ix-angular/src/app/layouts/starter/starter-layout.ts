/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  IxApplication,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxMenu,
  IxMenuItem,
} from '@siemens/ix-angular/standalone';
import { CompanyLogoComponent } from '../../shared/components/company-logo/company-logo.component';
import { iconHome, iconPiechart, iconTable, iconTextDocument } from '@siemens/ix-icons/icons';

@Component({
  selector: 'app-starter-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    IxApplication,
    IxApplicationHeader,
    IxAvatar,
    IxMenu,
    IxMenuItem,
    IxContent,
    CompanyLogoComponent,
  ],
  templateUrl: './starter-layout.html',
  styleUrl: './starter-layout.css',
})
export class StarterLayout {
  private readonly router = inject(Router);

  readonly icons = {
    iconHome,
    iconTextDocument,
    iconPiechart,
    iconTable,
  } as const;

  protected readonly showLogo = !window.customElements.get('ix-siemens-logo');

  isActiveRoute(path: string): boolean {
    if (path === '/') {
      return this.router.url === '/' || this.router.url === '';
    }
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }
}
