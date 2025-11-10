// src/components/dashboard/Donut.tsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as ChartTooltip,
} from "@/lib/recharts-safe";

export default function Donut({
  data,
  nameKey,
  valueKey,
}: {
  data: any[];
  nameKey: string;   // 'name' | 'type'
  valueKey: string;  // 'count'
}) {
  const has = Array.isArray(data) && data.length > 0;
  const colors = Array.from({ length: data?.length || 0 }, (_, i) => `hsl(${(i * 57) % 360},70%,70%)`);

  return (
    <div className="h-[260px]">
      {!has ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip />
            <Legend />
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
