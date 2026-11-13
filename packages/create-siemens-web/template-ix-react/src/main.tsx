/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@siemens/ix/dist/siemens-ix/siemens-ix.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
