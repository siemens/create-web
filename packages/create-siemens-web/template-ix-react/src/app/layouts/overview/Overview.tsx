/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { Link } from 'react-router-dom';
import { IxApplicationHeader, IxAvatar, IxContent } from '@siemens/ix-react';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import styles from './Overview.module.css';

export const Overview = () => (
  <>
    <div className={styles.overview}>
      <IxApplicationHeader name="Siemens Industrial Experience Templates" showMenu={false}>
        <CompanyLogo />
        <IxAvatar initials="JD" aria-label="User avatar: JD" />
      </IxApplicationHeader>
      <main className={styles.mainContent}>
        <IxContent>
          <h1>Template overview</h1>
          <p>Explore the available Siemens Industrial Experience layouts.</p>
          <div className={styles.layouts}>
            <Link
              to="/blank"
              className={styles.card}
              aria-labelledby="blank-title"
              aria-describedby="blank-description"
            >
              <h2 id="blank-title">Blank</h2>
              <p id="blank-description">
                An application shell with empty main content and no examples.
              </p>
            </Link>
            <Link
              to="/starter"
              className={styles.card}
              aria-labelledby="starter-title"
              aria-describedby="starter-description"
            >
              <h2 id="starter-title">Starter</h2>
              <p id="starter-description">An application shell with forms, charts, and grids.</p>
            </Link>
          </div>
        </IxContent>
      </main>
    </div>
  </>
);
