/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Navigate, type RouteObject } from 'react-router-dom';
import { StarterLayout } from './StarterLayout';
import Charts from './pages/charts/Charts';
import Forms from './pages/forms/Forms';
import GetStarted from './pages/get-started/GetStarted';
import Grids from './pages/grids/Grids';
import './setup';

export const route: RouteObject = {
  path: '/',
  element: <StarterLayout />,
  children: [
    { index: true, element: <GetStarted /> },
    { path: 'forms', element: <Forms /> },
    { path: 'charts', element: <Charts /> },
    { path: 'grids', element: <Grids /> },
    { path: '*', element: <Navigate to=".." replace /> },
  ],
};

export const routes: RouteObject[] = [route];
