// src/components/dashboard/ChartKit.tsx

import React from "react";
import type { ChartOptions } from "chart.js";

export const chartTheme = {
  primary: "#635bff",
  primarySoft: "rgba(99,91,255,0.30)",
  info: "#0ea5e9",
  gray: "#9ca3af",
  axis: "#1f2937",
  grid: "rgba(0,0,0,0.06)",
};

export function useBaseOptions(opts?: {
  stacked?: boolean;
  yBeginAtZero?: boolean;
  showLegend?: boolean;
}): ChartOptions<"line" | "bar"> {
  const { stacked = false, yBeginAtZero = true, showLegend = true } = opts || {};

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,         // smoother WS updates
    normalized: true,
    // IMPORTANT: Chart.js v4 types: parsing can be false or an object. `true` is invalid.
    // We want parsing enabled (needed for stacked charts), so either omit or pass {}.
    parsing: {},

    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        stacked,
        grid: { color: "rgba(0,0,0,0.03)" },
        ticks: { color: chartTheme.axis },
      },
      y: {
        stacked,
        beginAtZero: yBeginAtZero,
        grid: { color: chartTheme.grid },
        ticks: { color: chartTheme.axis },
      },
    },
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: { usePointStyle: true },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  };
}

export function ChartCard({
  title,
  info,
  height = 280,
  loading,
  children,
}: {
  title: string;
  info?: string;
  height?: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        {info ? <span className="text-xs text-gray-500">{info}</span> : null}
      </div>
      <div className="p-4" style={{ height }}>
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
