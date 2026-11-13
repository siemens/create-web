/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { StarterLayout } from './StarterLayout';

const Charts = lazy(() => import('./pages/charts/Charts'));
const Forms = lazy(() => import('./pages/forms/Forms'));
const GetStarted = lazy(() => import('./pages/get-started/GetStarted'));
const Grids = lazy(() => import('./pages/grids/Grids'));

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
