/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IxApplicationHeader, IxAvatar, IxContent } from '@siemens/ix-angular/standalone';
import { CompanyLogoComponent } from '../../shared/components/company-logo/company-logo.component';

@Component({
  selector: 'app-overview',
  imports: [RouterLink, IxApplicationHeader, IxAvatar, IxContent, CompanyLogoComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  protected readonly showLogo = !window.customElements.get('ix-siemens-logo');
}
