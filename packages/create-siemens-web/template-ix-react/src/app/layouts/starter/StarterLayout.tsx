/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Suspense } from 'react';
import { Outlet, resolvePath, useLocation, useNavigate, useResolvedPath } from 'react-router-dom';
import {
  IxApplication,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxMenu,
  IxMenuItem,
} from '@siemens/ix-react';
import { iconHome, iconPiechart, iconTable, iconTextDocument } from '@siemens/ix-icons/icons';
import { CompanyLogo } from '../../shared/components/CompanyLogo';

export const StarterLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useResolvedPath('.').pathname;
  const isActive = (path: string) => location.pathname === resolvePath(path, basePath).pathname;

  return (
    <IxApplication>
      <IxApplicationHeader name="Siemens Industrial Experience Starter App">
        <CompanyLogo />
        <IxAvatar initials="JD" aria-label="User avatar: JD" />
      </IxApplicationHeader>
      <IxMenu enableToggleTheme aria-label="Main navigation">
        <IxMenuItem
          icon={iconHome}
          active={isActive('.')}
          aria-label="Get Started"
          onClick={event => {
            event.preventDefault();
            navigate('.');
          }}
        >
          Get Started
        </IxMenuItem>
        <IxMenuItem
          icon={iconTextDocument}
          active={isActive('forms')}
          aria-label="Forms"
          onClick={event => {
            event.preventDefault();
            navigate('forms');
          }}
        >
          Forms
        </IxMenuItem>
        <IxMenuItem
          icon={iconPiechart}
          active={isActive('charts')}
          aria-label="Charts"
          onClick={event => {
            event.preventDefault();
            navigate('charts');
          }}
        >
          Charts
        </IxMenuItem>
        <IxMenuItem
          icon={iconTable}
          active={isActive('grids')}
          aria-label="Grids"
          onClick={event => {
            event.preventDefault();
            navigate('grids');
          }}
        >
          Grids
        </IxMenuItem>
      </IxMenu>
      <IxContent>
        <Suspense fallback={<p role="status">Loading page...</p>}>
          <Outlet />
        </Suspense>
      </IxContent>
    </IxApplication>
  );
};
