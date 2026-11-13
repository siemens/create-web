/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IxContentHeader, IxTypography, IxLinkButton } from '@siemens/ix-angular/standalone';

@Component({
  selector: 'app-get-started',
  imports: [RouterLink, IxContentHeader, IxTypography, IxLinkButton],
  templateUrl: './get-started.component.html',
  styleUrl: './get-started.component.css',
})
export class GetStartedComponent {}
