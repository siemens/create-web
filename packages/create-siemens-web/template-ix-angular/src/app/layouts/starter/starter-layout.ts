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
import { iconHome, iconPiechart, iconTable, iconTextDocument } from '@siemens/ix-icons/icons';
import { CompanyLogoComponent } from '../../shared/components/company-logo/company-logo.component';

@Component({
  selector: 'app-starter-layout',
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
  templateUrl: './starter-layout.html',
  styleUrl: './starter-layout.css',
})
export class StarterLayout {
  protected readonly icons = { iconHome, iconTextDocument, iconPiechart, iconTable };
  protected readonly showLogo = !window.customElements.get('ix-siemens-logo');
}
