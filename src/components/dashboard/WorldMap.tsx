// src/components/dashboard/WorldMap.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { GeoCityPoint } from "@/services/dashboardService";

type CountryRow = { country: string; count: number };

type Props = {
  countries?: CountryRow[];
  cities?: GeoCityPoint[];
  rangeLabel?: string;
  height?: number;
  worldJsonUrl?: string; // default: "/assets/maps/world.json"
};

export default function WorldMap({
  countries = [],
  cities = [],
  rangeLabel,
  height = 540,
  worldJsonUrl = "/assets/maps/world.json",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const countrySeries = useMemo(
    () => (countries || []).map(d => ({ name: d.country, value: d.count || 0 })),
    [countries]
  );

  const citySeries = useMemo(
    () =>
      (cities || []).map(c => ({
        name: `${c.city || "Unknown"}, ${c.country || "Unknown"}`,
        value: [Number(c.lng), Number(c.lat), Number(c.count || 0)],
        debug_ids: Array.isArray(c.debug_ids) ? c.debug_ids : [],
      })),
    [cities]
  );

  // One-time init: load world.json, register, init chart, set base option
  useEffect(() => {
    let chart: echarts.ECharts | null = null;
    let disposed = false;

    (async () => {
      // 1) Make sure the map is registered BEFORE setting any option that references it
      try {
        const res = await fetch(worldJsonUrl, { cache: "force-cache" });
        if (!res.ok) throw new Error("world.json fetch failed");
        const worldJson = await res.json();
        if (disposed) return;
        echarts.registerMap("world", worldJson);
      } catch (e) {
        console.error("Failed to load world.json:", e);
        // We can still render the scatter without a base map if needed,
        // but leave 'map: "world"' in place only if registration succeeded.
      }

      // 2) Init chart
      if (!ref.current) return;
      chart = echarts.init(ref.current);

      const maxVal = Math.max(10, ...countrySeries.map(d => d.value || 0));

      chart.setOption({
        tooltip: {
          trigger: "item",
          formatter: (p: any) => {
            if (typeof p.value === "number") {
              return `${p.name}: ${Number(p.value ?? 0).toLocaleString()} visitors`;
            }
            if (Array.isArray(p.value)) {
              const ids = p.data?.debug_ids;
              return `${p.name}<br/>Live Visitors: ${p.value?.[2] ?? 0}${
                Array.isArray(ids) && ids.length ? `<br/>IDs: ${ids.join(", ")}` : ""
              }`;
            }
            return `${p.name}: 0`;
          },
        },
        visualMap: {
          min: 0,
          max: maxVal,
          left: "left",
          bottom: 10,
          text: ["High", "Low"],
          calculable: true,
          inRange: { color: ["#e0f3ff", "#007bff"] },
        },
        geo: {
          // safe: only set a map name that we attempted to register
          map: "world",
          roam: true,
          zoom: 1.2,
          aspectScale: 0.9,
          label: { show: false },
          itemStyle: { areaColor: "#f5f5f5", borderColor: "#999" },
          emphasis: { itemStyle: { areaColor: "#e0f2fe" } },
        },
        series: [
          {
            name: "Visitors",
            type: "map",
            map: "world",
            geoIndex: 0,
            data: countrySeries,
          },
          {
            id: "live-scatter",
            name: "Live Visitors",
            type: "effectScatter",
            coordinateSystem: "geo",
            data: citySeries,
            symbolSize: (val: any[]) => Math.max(8, Math.sqrt(Number(val?.[2] ?? 1)) * 3),
            showEffectOn: "render",
            rippleEffect: { brushType: "stroke", scale: 5, period: 4 },
            itemStyle: {
              color: "#ff4d4f",
              borderColor: "#ff4d4f",
              borderWidth: 2,
              shadowBlur: 15,
              shadowColor: "rgba(255,0,0,0.5)",
            },
            zlevel: 10,
          },
        ],
      });

      setReady(true);

      const onResize = () => chart?.resize();
      window.addEventListener("resize", onResize);

      return () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
        chart?.dispose();
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // Lightweight updates when data changes (no re-init)
  useEffect(() => {
    if (!ready || !ref.current) return;
    const chart = echarts.getInstanceByDom(ref.current);
    if (!chart) return;
    const maxVal = Math.max(10, ...countrySeries.map(d => d.value || 0));

    chart.setOption(
      {
        visualMap: { max: maxVal },
        series: [
          { // map layer
            type: "map",
            map: "world",
            data: countrySeries,
          },
          { // live scatter
            id: "live-scatter",
            data: citySeries,
          },
        ],
      },
      false
    );
  }, [ready, countrySeries, citySeries]);

  return (
    <div className="space-y-2">
      {rangeLabel && <div className="text-sm text-muted-foreground">{rangeLabel}</div>}
      <div ref={ref} style={{ width: "100%", height }} />
    </div>
  );
}
