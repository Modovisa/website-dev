// src/components/dashboard/ChartKit.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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

ChartJS.defaults.font.family =
  "'Modovisa', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
ChartJS.defaults.color = "#1f2937";
ChartJS.defaults.plugins.legend.labels.boxWidth = 12;
ChartJS.defaults.plugins.legend.labels.padding = 15;
ChartJS.defaults.plugins.tooltip.backgroundColor = "rgba(255,255,255,0.98)";
ChartJS.defaults.plugins.tooltip.borderColor = "#e5e7eb";
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.titleColor = "#0b1220";
ChartJS.defaults.plugins.tooltip.bodyColor = "#0b1220";

export const chartTheme = {
  grid: "rgba(0,0,0,0.04)",
  axis: "rgba(0,0,0,0.55)",
  primary: "#635bff",
  primarySoft: "rgba(99,91,255,0.30)",
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
          labels: { color: chartTheme.axis },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          stacked,
          ticks: { color: chartTheme.axis, maxRotation: 45, minRotation: 0 },
          grid: { display: true, color: "rgba(0,0,0,0.03)" },
        },
        y: {
          stacked,
          beginAtZero: yBeginAtZero,
          ticks: { color: chartTheme.axis },
          grid: { color: chartTheme.grid },
        },
      },
    }),
    [stacked, yBeginAtZero, showLegend]
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={text}
            className="ml-2 text-muted-foreground hover:text-foreground"
            type="button"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] text-xs leading-5"
        >
          {text}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

/**
 * Shared dashboard section header: Title + InfoTip
 * Use this for ALL non-KPI cards in Dashboard, and internally in ChartCard.
 */
export function SectionHeader({
  title,
  info,
}: {
  title: string;
  info?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 p-4">
      <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
        {title}
      </CardTitle>
      {info ? <InfoTip text={info} /> : null}
    </div>
  );
}

export function ChartCard({
  title,
  info,
  loading,
  hasData,
  children,
  className,
  height = 340,
}: {
  title: string;
  info?: string;
  /** loading = true will show skeleton ONLY if hasData === false */
  loading?: boolean;
  /** pass true after first snapshot; prevents blanking on refresh */
  hasData?: boolean;
  children: React.ReactNode;
  className?: string;
  height?: number;
}) {
  const showSkeleton = !!loading && !hasData;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <SectionHeader title={title} info={info} />
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="relative">
          {showSkeleton ? (
            <div className="absolute inset-0 flex flex-col p-3">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="flex-1 rounded-md border border-dashed border-muted-foreground/20">
                <div className="h-full w-full grid grid-cols-12">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="mx-1 flex items-end">
                      <Skeleton
                        className="w-full"
                        style={{
                          height: Math.max(20, ((i + 3) % 12) * 12),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 self-center">
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}
