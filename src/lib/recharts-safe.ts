// src/lib/recharts-safe.ts

// One-stop safe re-exports for Recharts components.
// This sidesteps JSX constructor typing clashes in your current TS setup.
export { ResponsiveContainer } from "recharts";

import * as R from "recharts";

// Cast to `any` to avoid "cannot be used as a JSX component" errors while we stabilize types
export const LineChart = R.LineChart as unknown as any;
export const Line = R.Line as unknown as any;
export const BarChart = R.BarChart as unknown as any;
export const Bar = R.Bar as unknown as any;
export const AreaChart = R.AreaChart as unknown as any;
export const Area = R.Area as unknown as any;
export const XAxis = R.XAxis as unknown as any;
export const YAxis = R.YAxis as unknown as any;
export const Legend = R.Legend as unknown as any;
export const Tooltip = R.Tooltip as unknown as any;
export const PieChart = R.PieChart as unknown as any;
export const Pie = R.Pie as unknown as any;
export const Cell = R.Cell as unknown as any;
