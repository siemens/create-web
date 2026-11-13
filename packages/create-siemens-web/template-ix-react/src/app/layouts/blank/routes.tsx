/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Navigate, type RouteObject } from 'react-router-dom';
import { BlankLayout } from './BlankLayout';
import Home from './pages/home/Home';

export const route: RouteObject = {
  path: '/',
  element: <BlankLayout />,
  children: [
    { index: true, element: <Home /> },
    { path: '*', element: <Navigate to=".." replace /> },
  ],
};

export const routes: RouteObject[] = [route];
