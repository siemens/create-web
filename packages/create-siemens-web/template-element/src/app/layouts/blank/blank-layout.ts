/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { elementHome } from '@siemens/element-icons';
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
  SiHeaderDropdownTriggerDirective
} from '@siemens/element-ng/header-dropdown';
import { addIcons } from '@siemens/element-ng/icon';
import { NavbarVerticalItem, SiNavbarVerticalComponent } from '@siemens/element-ng/navbar-vertical';

@Component({
  selector: 'app-blank-layout',
  imports: [
    RouterLink,
    RouterOutlet,
    SiAccountDetailsComponent,
    SiApplicationHeaderComponent,
    SiHeaderAccountItemComponent,
    SiHeaderActionsDirective,
    SiHeaderBrandDirective,
    SiHeaderDropdownComponent,
    SiHeaderDropdownTriggerDirective,
    SiHeaderLogoDirective,
    SiNavbarVerticalComponent
  ],
  templateUrl: './blank-layout.html',
  host: { class: 'has-navbar-fixed-top si-layout-inner' }
})
export class BlankLayout {
  protected readonly icons = addIcons({ elementHome });
  protected readonly menuItems: NavbarVerticalItem[] = [
    {
      type: 'router-link',
      label: 'NAV.HOME',
      id: 'home',
      icon: this.icons.elementHome,
      routerLink: 'home'
    }
  ];
}
