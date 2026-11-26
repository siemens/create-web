/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import '@siemens/ix/css/default.css';
import '@siemens/ix/css/legacy.css';
import type { ReactNode } from 'react';

export default function Wrapper({ children }: { children: ReactNode }) {
  document.documentElement.setAttribute('data-ix-theme', 'community');
  document.documentElement.setAttribute('data-ix-color-schema', 'dark');

  return <>{children}</>;
}
