/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Navigate, type RouteObject } from 'react-router-dom';
import { Overview } from './layouts/overview/Overview';
import { createRoutes as createBlankRoutes } from './layouts/blank/routes';
import { createRoutes as createStarterRoutes } from './layouts/starter/routes';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Overview />,
  },
  ...createBlankRoutes('/blank'),
  ...createStarterRoutes('/starter'),
  { path: '*', element: <Navigate to="/" replace /> },
];
