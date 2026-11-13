/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { useRoutes } from 'react-router-dom';
import { routes } from './app/app.routes';

const App = () => useRoutes(routes);

export default App;
