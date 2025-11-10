// src/components/dashboard/TimeGroupedVisits.tsx

import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { LabelSeries, RangeKey } from '@/types/dashboard';

export default function TimeGroupedVisits({
  data,
  range,
}: {
  data: LabelSeries[];
  range: RangeKey;
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="h-[380px]">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="visitors" name="Visitors" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="views"
              name="Views"
              fill="hsl(var(--primary))"
              opacity={0.35}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        {({ '24h': 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12mo': 'Last 12 months' } as any)[range] || ''}
      </div>
    </div>
  );
}

