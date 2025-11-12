// src/components/dashboard/WorldMap.tsx

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import {
  GeoComponent,
  GeoComponentOption,
  VisualMapComponent,
  VisualMapComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from "echarts/components";
import { ScatterChart, ScatterSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import type { CountryRow } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";

// Register needed parts once
echarts.use([GeoComponent, VisualMapComponent, TooltipComponent, ScatterChart, CanvasRenderer]);

// World map geoJSON
// Note: many setups bundle this file; keep try/catch so re-registering doesn't crash in HMR.
let worldRegistered = false;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - depending on bundler, path resolution may differ; adjust if your alias differs.
  // You can swap to a local JSON if your build doesn't ship this.
  const worldJson = require("echarts/map/json/world.json");
  if (!worldRegistered) {
    echarts.registerMap("world", worldJson);
    worldRegistered = true;
  }
} catch {
  // Fallback: leave geo without map registration; chart will render axes-less background.
}

type ECOption = echarts.ComposeOption<
  GeoComponentOption | VisualMapComponentOption | TooltipComponentOption | ScatterSeriesOption
>;

type Props = {
  countries?: CountryRow[];
  cities: GeoCityPoint[]; // << strict: { city, country, lat, lng, count, debug_ids? }
  height?: number;
  className?: string;
};

export default function WorldMap({ countries, cities, height = 520, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  // Prepare scatter points (transform only here; upstream stays GeoCityPoint[])
  const scatterData = useMemo(
    () =>
      (cities || []).map((c) => ({
        name: `${c.city}, ${c.country}`,
        value: [Number(c.lng), Number(c.lat), Number(c.count || 0)],
        _debug_ids: c.debug_ids,
      })),
    [cities]
  );

  const maxCount = useMemo(() => {
    const m = scatterData.reduce((acc, d) => Math.max(acc, Number(d.value?.[2] || 0)), 0);
    return Math.max(1, m);
  }, [scatterData]);

  // init once
  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
      window.addEventListener("resize", handleResize);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // incremental updates (no dispose)
  useEffect(() => {
    if (!chartRef.current) return;

    const option: ECOption = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const [lng, lat, count] = params.value || [];
          const name = params.name || "";
          return `${name}<br/>Visitors: <b>${count ?? 0}</b><br/>(${lat?.toFixed?.(2)}, ${lng?.toFixed?.(2)})`;
        },
      },
      visualMap: {
        type: "continuous",
        min: 0,
        max: maxCount,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 12,
        inRange: {
          // keep default theme colors; project theme handles canvas background
          color: undefined,
        },
        // Keep minimal UI clutter
        text: ["High", "Low"],
      },
      geo: {
        map: worldRegistered ? "world" : undefined,
        roam: true,
        silent: false,
        emphasis: { disabled: false },
        itemStyle: {
          borderColor: "#99999933",
          borderWidth: 0.5,
        },
        label: { show: false },
      },
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          name: "Cities",
          encode: { lng: 0, lat: 1, value: 2 },
          symbolSize: (val: any) => {
            const count = Number(val?.[2] || 0);
            // scaled size: 6..22
            const base = 6;
            const maxSz = 22;
            if (maxCount <= 1) return base;
            const t = Math.min(1, count / maxCount);
            return base + t * (maxSz - base);
          },
          data: scatterData,
          emphasis: { scale: 1.15 },
          itemStyle: {
            shadowBlur: 8,
            shadowColor: "rgba(0,0,0,0.15)",
          },
        },
      ],
    };

    // Not merging structure of geo/series indexes, but letting ECharts diff props and data
    chartRef.current.setOption(option as any, { notMerge: false, lazyUpdate: true });

  }, [scatterData, maxCount, countries]);

  function handleResize() {
    chartRef.current?.resize();
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: "100%", height }}
      aria-label="World visitor map"
    />
  );
}
