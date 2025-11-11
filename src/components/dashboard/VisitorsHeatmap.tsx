// src/components/dashboard/VisitorsHeatmap.tsx

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

type Props = {
  data: Array<[string, number]>; // e.g. [["2025-06-08", 123], ...]
  year?: number;                 // optional: limit to year
  height?: number;               // px
};

export default function VisitorsHeatmap({ data = [], year, height = 220 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const values = data.map((d) => d[1]).filter((v) => typeof v === "number" && !Number.isNaN(v));
    const maxValue = Math.max(10, ...values);

    const selectedYear = year ?? new Date().getFullYear();
    const start = `${selectedYear}-01-01`;
    const end = `${selectedYear}-12-31`;

    chart.setOption({
      tooltip: {
        position: "top",
        formatter: ({ value }: any) => {
          const [date, count] = value || [];
          return `${date}<br/>Visitors: ${Number(count ?? 0).toLocaleString()}`;
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: "vertical",
        left: "left",
        inRange: { color: ["#f8f8ff", "#635bff"] },
      },
      calendar: {
        top: 40,
        left: 110,
        right: 10,
        range: [start, end],
        cellSize: ["auto", 18],
        splitLine: { show: true, lineStyle: { color: "#e5e7eb", width: 1 } },
        itemStyle: { borderWidth: 0.5, borderColor: "#e5e7eb" },
        yearLabel: { show: false },
        dayLabel: { nameMap: "en" },
        monthLabel: { nameMap: "en" },
      },
      series: [{ type: "heatmap", coordinateSystem: "calendar", data }],
    });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [data, year]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
