// src/components/dashboard/WorldMap.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { GeoCityPoint } from "@/services/homepage-checkout.store";

type CountryRow = { country: string; count: number };
type Props = {
  countries: CountryRow[];
  cities?: GeoCityPoint[];
  rangeLabel?: string;
  height?: number;
};

let WORLD_JSON_LOADED = false;

export default function WorldMap({ countries = [], cities = [], rangeLabel, height = 540 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const countrySeries = useMemo(
    () => (countries || []).map((d) => ({ name: d.country, value: d.count || 0 })),
    [countries]
  );

  const citySeries = useMemo(
    () =>
      (cities || []).map((c) => ({
        name: `${c.city || "Unknown"}, ${c.country || "Unknown"}`,
        value: [c.lng, c.lat, c.count],
        debug_ids: c.debug_ids ?? [],
      })),
    [cities]
  );

  useEffect(() => {
    let chart: echarts.ECharts | null = null;

    (async () => {
      try {
        if (!WORLD_JSON_LOADED) {
          const res = await fetch("/assets/maps/world.json", { cache: "force-cache" });
          const worldJson = await res.json();
          echarts.registerMap("world", worldJson);
          WORLD_JSON_LOADED = true;
        }
      } catch (e) {
        console.error("Failed to load world.json", e);
      }

      if (!ref.current) return;
      chart = echarts.init(ref.current);
      setReady(true);

      const maxVal = Math.max(10, ...countrySeries.map((d) => d.value || 0));
      chart.setOption({
        tooltip: {
          trigger: "item",
          formatter: (p: any) => {
            if (typeof p.value === "number") return `${p.name}: ${p.value.toLocaleString()} visitors`;
            if (Array.isArray(p.value)) {
              const ids = p.data?.debug_ids;
              return `${p.name}<br/>Live Visitors: ${p.value?.[2] ?? 0}${Array.isArray(ids) && ids.length ? `<br/>IDs: ${ids.join(", ")}` : ""}`;
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
          map: "world",
          roam: true,
          zoom: 1.2,
          aspectScale: 0.9,
          label: { show: false },
          itemStyle: { areaColor: "#f5f5f5", borderColor: "#999" },
          emphasis: { itemStyle: { areaColor: "#e0f2fe" } },
        },
        series: [
          { name: "Visitors", type: "map", map: "world", geoIndex: 0, data: countrySeries },
          {
            id: "live-scatter",
            name: "Live Visitors",
            type: "effectScatter",
            coordinateSystem: "geo",
            data: citySeries,
            symbolSize: (val: any[]) => Math.max(8, Math.sqrt(Number(val?.[2] ?? 1)) * 3),
            showEffectOn: "render",
            rippleEffect: { brushType: "stroke", scale: 5, period: 4 },
            itemStyle: { color: "#ff4d4f", borderColor: "#ff4d4f", borderWidth: 2, shadowBlur: 15, shadowColor: "rgba(255,0,0,0.5)" },
            zlevel: 10,
          },
        ],
      });

      const onResize = () => chart?.resize();
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        chart?.dispose();
      };
    })();
  }, []); // mount

  // Update datasets without re-init
  useEffect(() => {
    if (!ready || !ref.current) return;
    const chart = echarts.getInstanceByDom(ref.current);
    if (!chart) return;
    const maxVal = Math.max(10, ...countrySeries.map((d) => d.value || 0));
    chart.setOption(
      {
        visualMap: { max: maxVal },
        series: [
          { type: "map", data: countrySeries },
          { id: "live-scatter", data: citySeries },
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
