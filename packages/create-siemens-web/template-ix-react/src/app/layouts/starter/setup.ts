/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import { registerTheme } from '@siemens/ix-echarts';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
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
