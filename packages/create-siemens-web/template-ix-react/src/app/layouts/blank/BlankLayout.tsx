/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Outlet, useLocation, useNavigate, useResolvedPath } from 'react-router-dom';
import {
  IxApplication,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxMenu,
  IxMenuItem,
} from '@siemens/ix-react';
import { iconHome } from '@siemens/ix-icons/icons';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import styles from './BlankLayout.module.css';

export const BlankLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const home = useResolvedPath('.').pathname;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <IxApplication>
        <IxApplicationHeader name="Siemens Industrial Experience App">
          <CompanyLogo />
          <IxAvatar initials="JD" aria-label="User avatar: JD" />
        </IxApplicationHeader>
        <IxMenu enableToggleTheme aria-label="Main navigation">
          <IxMenuItem
            icon={iconHome}
            active={location.pathname === home}
            aria-label="Home"
            onClick={event => {
              event.preventDefault();
              navigate('.');
            }}
          >
            Home
          </IxMenuItem>
        </IxMenu>
        <IxContent id="main-content" className={styles.mainContent}>
          <Outlet />
        </IxContent>
      </IxApplication>
    </>
  );
};
