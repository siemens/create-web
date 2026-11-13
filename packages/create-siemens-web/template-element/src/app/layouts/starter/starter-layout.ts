/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  elementDashboard,
  elementDocument,
  elementHome,
  elementList
} from '@siemens/element-icons';
import {
  SiAccountDetailsComponent,
  SiApplicationHeaderComponent,
  SiHeaderAccountItemComponent,
  SiHeaderActionsDirective,
  SiHeaderBrandDirective,
  SiHeaderLogoDirective
} from '@siemens/element-ng/application-header';
import {
  SiHeaderDropdownComponent,
  SiHeaderDropdownItemComponent,
  SiHeaderDropdownTriggerDirective
} from '@siemens/element-ng/header-dropdown';
import { addIcons } from '@siemens/element-ng/icon';
import { NavbarVerticalItem, SiNavbarVerticalComponent } from '@siemens/element-ng/navbar-vertical';
import { ThemeType } from '@siemens/element-ng/theme';

import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-starter-layout',
  imports: [
    RouterLink,
    RouterOutlet,
    SiAccountDetailsComponent,
    SiApplicationHeaderComponent,
    SiHeaderAccountItemComponent,
    SiHeaderActionsDirective,
    SiHeaderBrandDirective,
    SiHeaderDropdownComponent,
    SiHeaderDropdownItemComponent,
    SiHeaderDropdownTriggerDirective,
    SiHeaderLogoDirective,
    SiNavbarVerticalComponent,
    TranslatePipe
  ],
  templateUrl: './starter-layout.html',
  host: { class: 'has-navbar-fixed-top si-layout-inner' }
})
export class StarterLayout {
  protected readonly settingsService = inject(SettingsService);
  protected readonly languageItems = this.settingsService.availableLanguages.map(language => ({
    value: language,
    label: `LANGUAGE.${language.toUpperCase()}`
  }));
  protected readonly icons = addIcons({
    elementDashboard,
    elementDocument,
    elementHome,
    elementList
  });
  protected readonly menuItems: NavbarVerticalItem[] = [
    {
      type: 'router-link',
      label: 'NAV.GET-STARTED',
      id: 'get-started',
      icon: this.icons.elementHome,
      routerLink: 'get-started'
    },
    {
      type: 'router-link',
      label: 'NAV.FORMS',
      id: 'forms',
      icon: this.icons.elementDocument,
      routerLink: 'forms'
    },
    {
      type: 'router-link',
      label: 'NAV.CHARTS',
      id: 'charts',
      icon: this.icons.elementDashboard,
      routerLink: 'charts'
    },
    {
      type: 'router-link',
      label: 'NAV.GRIDS',
      id: 'grids',
      icon: this.icons.elementList,
      routerLink: 'grids'
    }
  ];
  protected switchTheme(theme: string) {
    this.settingsService.setTheme(theme as ThemeType);
  }
}
