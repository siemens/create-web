/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { registerTheme } from '@siemens/ix-echarts';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer,
]);
registerTheme(echarts);
ModuleRegistry.registerModules([AllCommunityModule]);
