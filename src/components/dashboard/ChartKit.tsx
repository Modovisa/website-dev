// src/components/dashboard/ChartKit.tsx

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

/* ---------------- Chart.js registration ---------------- */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  Filler,
  Tooltip,
  Legend
);

/* ---------------- Theme tuned to your Bootstrap screenshots ---------------- */
export const chartTheme = {
  grid: "rgba(0,0,0,0.06)",
  axis: "rgba(0,0,0,0.35)",
  primary: "hsl(var(--primary))",
  info: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  gray: "#9ca3af",
};

export type BaseOpts = {
  stacked?: boolean;
  yBeginAtZero?: boolean;
  showLegend?: boolean;
};

export function useBaseOptions(opts: BaseOpts = {}) {
  const { stacked = false, yBeginAtZero = true, showLegend = true } = opts;
  return useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom" as const,
          labels: { color: chartTheme.axis, boxWidth: 10, usePointStyle: true, pointStyle: "circle" },
        },
        tooltip: {
          enabled: true,
          titleColor: chartTheme.axis,
          bodyColor: "#111827",
          backgroundColor: "rgba(255,255,255,0.96)",
          borderColor: "rgba(0,0,0,0.08)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          stacked,
          ticks: { color: chartTheme.axis, font: { size: 12 } },
          grid: { display: false },
        },
        y: {
          stacked,
          beginAtZero: yBeginAtZero,
          ticks: { color: chartTheme.axis, font: { size: 12 } },
          grid: { color: chartTheme.grid },
        },
      },
    }),
    [stacked, yBeginAtZero, showLegend]
  );
}

/* ---------------- Info icon (bootstrap-like) ---------------- */
export function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <button aria-label="info" className="ml-2 text-muted-foreground hover:text-foreground">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs leading-5">
          {text}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

/* ---------------- Chart Card with skeleton ---------------- */
export function ChartCard({
  title,
  info,
  loading,
  children,
  className,
}: {
  title: string;
  info?: string;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {info ? <InfoTip text={info} /> : null}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] md:h-[340px]">
          {loading ? (
            <div className="h-full flex flex-col justify-center gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-4 w-24 self-center" />
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}
