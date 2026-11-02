/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    class: 'si-layout-fixed-height',
  },
})
export class App {
  readonly settingsService = inject(SettingsService);
}
