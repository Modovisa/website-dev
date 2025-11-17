// src/components/dashboard/KpiCard.tsx

import * as React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

export interface KpiCardProps {
  title: string;
  info?: string;
  icon: IconType;
  value: number | string;
  change: number | null;      // backend may still send strings, we’ll coerce
  reverseColor?: boolean;
  loading?: boolean;
}

export function KpiCard({
  title,
  info,
  icon: Icon,
  value,
  change,
  reverseColor,
  loading,
}: KpiCardProps) {
  const displayValue = typeof value === "number" ? nf.format(value) : value;

  // Mirror original dashboard behaviour:
  // - any non-null/undefined change shows a line
  // - coerce via Number(), fallback to 0 if NaN
  const hasChange = change != null;
  const rawNumeric = hasChange ? Number(change) : 0;
  const numericChange = Number.isFinite(rawNumeric) ? rawNumeric : 0;

  // normal KPIs: up = good. reverseColor KPIs: down = good.
  const goodIsUp = !reverseColor;
  const isGood = goodIsUp ? numericChange >= 0 : numericChange <= 0;
  const changeColor = isGood ? "text-green-600" : "text-red-600";
  const arrow = numericChange >= 0 ? "↑" : "↓";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        {/* Title + info icon (KPI-specific, NOT using SectionHeader) */}
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="info"
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* KPI icon on the right */}
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {/* main value skeleton */}
            <Skeleton className="h-8 w-28" />
            {/* change stat skeletons (match original sizes if you want) */}
            <div className="flex gap-2 justify-start">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ) : (
          <>
            {/* Main KPI value */}
            <div className="text-3xl font-bold">{displayValue}</div>

            {/* Stat line underneath */}
            {hasChange && (
              <p className={`text-xs mt-1 ${changeColor}`}>
                {arrow} {Math.abs(numericChange).toFixed(1)}% from last period
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
