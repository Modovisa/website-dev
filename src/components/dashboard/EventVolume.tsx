// src/components/dashboard/EventVolume.tsx

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { LabelCount } from '@/types/dashboard';

export default function EventVolume({ data }: { data: LabelCount[] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="h-[300px]">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            <Line type="monotone" dataKey="count" dot={false} stroke="hsl(var(--primary))" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

