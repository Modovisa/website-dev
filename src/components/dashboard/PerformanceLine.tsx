// src/components/dashboard/PerformanceLine.tsx

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
} from "@/lib/recharts-safe";
import type { LabelCount } from '@/types/dashboard';

export default function PerformanceLine({
  title,
  current,
  previous,
  color = '#5c6ac4',
}: {
  title: string;
  current: LabelCount[];
  previous?: LabelCount[];
  color?: string;
}) {
  const has = Array.isArray(current) && current.length > 0;
  const data = has
    ? current.map((c, i) => ({
        label: c.label,
        current: c.count,
        previous: previous?.[i]?.count ?? null,
      }))
    : [];

  return (
    <div className="h-[260px]">
      {!has ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip />
            <Legend />
            <Line type="monotone" dataKey="current" name={title} stroke={color} dot={false} />
            <Line type="monotone" dataKey="previous" name="Previous" stroke="#9ca3af" dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
