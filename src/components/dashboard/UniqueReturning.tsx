// src/components/dashboard/UniqueReturning.tsx

import { ResponsiveContainer, AreaChart, Area } from "@/lib/recharts-safe";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  PrettyTooltip,
  ChartLegend,          // ✅ styled legend
  chartTheme,
} from "./ChartKit";

type Row = { label: string; unique: number; returning: number };

export default function UniqueReturning({ data }: { data: Row[] }) {
  const has = Array.isArray(data) && data.length > 0;

  return (
    <ChartContainer>
      {!has ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.colors.info} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartTheme.colors.info} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.colors.success} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartTheme.colors.success} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <ChartGrid />
            <ChartXAxis dataKey="label" />
            <ChartYAxis />
            <PrettyTooltip />
            <ChartLegend /> {/* ✅ */}
            <Area type="monotone" dataKey="unique" name="Unique" stroke={chartTheme.colors.info} fill="url(#uvGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="returning" name="Returning" stroke={chartTheme.colors.success} fill="url(#rtGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}
