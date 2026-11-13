/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { computed, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SiThemeService, ThemeType } from '@siemens/element-ng/theme';

@Service()
export class SettingsService {
  private readonly translate = inject(TranslateService);
  private readonly themeService = inject(SiThemeService);
  readonly availableLanguages = ['en', 'de'];
  readonly language = computed(() => this.translate.currentLang() ?? 'en');
  readonly theme = signal<ThemeType>(this.loadTheme());

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(event => {
      localStorage.setItem('lang', event.lang);
      document.documentElement.lang = event.lang;
    });

    const language = localStorage.getItem('lang') ?? this.translate.getBrowserLang() ?? 'en';
    this.setLanguage(this.availableLanguages.includes(language) ? language : 'en');

    this.setTheme(this.theme());
  }

  setLanguage(language: string) {
    if (this.availableLanguages.includes(language)) {
      this.translate.use(language);
    }
  }

  setTheme(theme: ThemeType) {
    this.theme.set(theme);
    this.themeService.applyThemeType(theme);
    localStorage.setItem('theme', theme);
  }

  private loadTheme(): ThemeType {
    const theme = localStorage.getItem('theme');
    return theme === 'light' || theme === 'dark' ? theme : 'auto';
  }
}
