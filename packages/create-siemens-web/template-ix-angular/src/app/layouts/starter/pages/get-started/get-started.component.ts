/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IxContentHeader, IxTypography, IxLinkButton } from '@siemens/ix-angular/standalone';

@Component({
  selector: 'app-get-started',
  imports: [IxContentHeader, IxTypography, IxLinkButton],
  templateUrl: './get-started.component.html',
  styleUrl: './get-started.component.css',
})
export class GetStartedComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  navigate(path: string) {
    this.router.navigate([path], { relativeTo: this.route.parent });
  }
}
