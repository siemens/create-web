/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { MemoryRouter, useRoutes, type RouteObject } from 'react-router-dom';
import { render } from 'vitest-browser-react';
import '../../../styles.css';
import Wrapper from './Wrapper';

const RouteContent = ({ routes }: { routes: RouteObject[] }) => useRoutes(routes);

export const renderRoutes = (routes: RouteObject[], path = '/') => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteContent routes={routes} />
    </MemoryRouter>,
    { wrapper: Wrapper },
  );
};
