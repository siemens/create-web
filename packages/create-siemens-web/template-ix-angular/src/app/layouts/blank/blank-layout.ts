/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  IxApplication,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxMenu,
  IxMenuItem,
} from '@siemens/ix-angular/standalone';
import { iconHome } from '@siemens/ix-icons/icons';
import { CompanyLogoComponent } from '../../shared/components/company-logo/company-logo.component';

@Component({
  selector: 'app-blank-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IxApplication,
    IxApplicationHeader,
    IxAvatar,
    IxContent,
    IxMenu,
    IxMenuItem,
    CompanyLogoComponent,
  ],
  templateUrl: './blank-layout.html',
  styleUrl: './blank-layout.css',
})
export class BlankLayout {
  protected readonly iconHome = iconHome;
  protected readonly showLogo = !window.customElements.get('ix-siemens-logo');
}
