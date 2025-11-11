// src/components/dashboard/ChartKit.tsx

import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip as ChartTooltip,
} from "@/lib/recharts-safe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/* ---------- Theme (Chart.js-like) ---------- */
export const chartTheme = {
  grid: { stroke: "rgba(0,0,0,0.06)", strokeDasharray: "3 3" },
  axis: {
    tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
    stroke: "rgba(0,0,0,0.12)",
  },
  line: { strokeWidth: 2, dot: false, type: "monotone" as const },
  area: { strokeWidth: 2, type: "monotone" as const, fillOpacity: 0.16 },
  bar: { radius: [6, 6, 0, 0] as [number, number, number, number], barGap: 6, barCategoryGap: "24%" },
  colors: {
    primary: "hsl(var(--primary))",
    success: "#22c55e",
    info: "#3b82f6",
    gray: "#9ca3af",
  },
};

/* ---------- Reusable bits ---------- */
export const ChartContainer = ({ children }: { children: ReactNode }) => (
  <div className="w-full h-[320px] md:h-[360px]">{children}</div>
);

export const ChartGrid = () => (
  <CartesianGrid stroke={chartTheme.grid.stroke} strokeDasharray={chartTheme.grid.strokeDasharray} />
);

export const ChartXAxis = ({ dataKey }: { dataKey: string }) => (
  <XAxis dataKey={dataKey} tick={chartTheme.axis.tick} stroke={chartTheme.axis.stroke} />
);

export const ChartYAxis = () => (
  <YAxis tick={chartTheme.axis.tick} stroke={chartTheme.axis.stroke} />
);

export const ChartLegend = () => (
  <Legend
    verticalAlign="bottom"
    height={28}
    wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 } as CSSProperties}
  />
);

/* ---------- Pretty tooltip using the SAFE wrapper ---------- */
export function PrettyTooltip() {
  return (
    <ChartTooltip
      wrapperStyle={{ outline: "none" }}
      content={({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
          <div className="rounded-md border bg-background px-3 py-2 shadow-sm">
            {label != null && <div className="text-xs mb-1 text-muted-foreground">{String(label)}</div>}
            <div className="space-y-0.5">
              {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2 w-2 rounded" style={{ background: p.color }} />
                  <span className="text-muted-foreground">{p.name}:</span>
                  <span className="font-medium">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}

/* ---------- Info icon like Bootstrap ---------- */
export const InfoTip = ({ text, className = "" }: { text: string; className?: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={`ml-2 text-muted-foreground hover:text-foreground ${className}`} aria-label="Info">
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-5">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/* Re-export for convenience (keeps imports tidy elsewhere) */
export { ResponsiveContainer };
