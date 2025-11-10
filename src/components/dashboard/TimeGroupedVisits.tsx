// src/components/dashboard/TimeGroupedVisits.tsx

import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { RangeKey, TimeBucket } from "@/types/dashboard";

type Props = {
  data: TimeBucket[];
  range: RangeKey;
};

const TITLES: Record<RangeKey, string> = {
  "24h": "Visits – Today",
  "7d": "Visits – Last 7 Days",
  "30d": "Visits – Last 30 Days",
  "90d": "Visits – Last 90 Days",
  "12mo": "Visits – Last 12 Months",
};

function ChartInner({ data, range }: Props) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="h-[300px]">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Legend />
            <Bar
              dataKey="visitors"
              name="Visitors"
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
              fillOpacity={1}
            />
            <Bar
              dataKey="views"
              name="Views"
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
              fillOpacity={0.35}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      {/* Accessible title for screen readers */}
      <span className="sr-only">{TITLES[range]}</span>
    </div>
  );
}

export default memo(ChartInner);
