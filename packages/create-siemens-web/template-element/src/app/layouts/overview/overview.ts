/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SiApplicationHeaderComponent,
  SiHeaderBrandDirective,
  SiHeaderLogoDirective
} from '@siemens/element-ng/application-header';

@Component({
  selector: 'app-overview',
  imports: [
    RouterLink,
    SiApplicationHeaderComponent,
    SiHeaderBrandDirective,
    SiHeaderLogoDirective
  ],
  templateUrl: './overview.html',
  host: { class: 'has-navbar-fixed-top si-layout-inner' }
})
export class Overview {}
