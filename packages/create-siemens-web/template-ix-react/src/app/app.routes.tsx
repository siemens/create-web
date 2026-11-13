/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Navigate, type RouteObject } from 'react-router-dom';
import { Overview } from './layouts/overview/Overview';
import { route as blankRoute } from './layouts/blank/routes';
import { route as starterRoute } from './layouts/starter/routes';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Overview />,
  },
  { ...blankRoute, path: '/blank' },
  { ...starterRoute, path: '/starter' },
  { path: '*', element: <Navigate to="/" replace /> },
];
