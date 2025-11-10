// src/components/dashboard/UniqueReturning.tsx

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
} from "@/lib/recharts-safe";

type Row = { label: string; unique: number; returning: number };

export default function UniqueReturning({ data }: { data: Row[] }) {
  const has = Array.isArray(data) && data.length > 0;
  return (
    <div className="h-[300px]">
      {!has ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip />
            <Legend />
            <Area type="monotone" dataKey="unique" name="Unique" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Area type="monotone" dataKey="returning" name="Returning" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
