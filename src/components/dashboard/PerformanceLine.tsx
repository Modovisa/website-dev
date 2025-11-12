// src/components/dashboard/PerformanceLine.tsx

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

function withAlphaHex(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, "0");
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return `#${full}${aa}`;
}

export default function PerformanceLine({
  title,
  current,
  previous,
  color = chartTheme.info,
  filled = false,
  loading,
}: {
  title: string;
  current: Row[];
  previous?: Row[];
  color?: string;
  filled?: boolean;
  loading?: boolean;
}) {
  const cur = Array.isArray(current) ? current : [];
  const prev = Array.isArray(previous) ? previous : [];

  const labels = useMemo(() => (cur.length ? cur : prev).map((d) => String(d.label ?? "")), [cur, prev]);
  const mPrev = useMemo(() => new Map(prev.map((r) => [String(r.label ?? ""), Number(r.count ?? 0)])), [prev]);
  const yCur = useMemo(() => labels.map((l) => Number(cur.find((c) => c.label === l)?.count ?? 0)), [labels, cur]);
  const yPrev = useMemo(() => labels.map((l) => Number(mPrev.get(l) ?? 0)), [labels, mPrev]);

  const bg = filled ? withAlphaHex(color, 0.18) : "transparent";

  const ds = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title,
          data: yCur,
          borderColor: color,
          backgroundColor: bg,
          fill: filled ? true : false,
          tension: 0.35,
          pointRadius: filled ? 2 : 0,
          pointHoverRadius: filled ? 4 : 0,
          borderWidth: 2,
          spanGaps: true,
        },
        {
          label: "Previous Period",
          data: yPrev,
          borderColor: chartTheme.gray,
          borderDash: [5, 5],
          backgroundColor: "transparent",
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          spanGaps: true,
        },
      ],
    }),
    [labels, yCur, yPrev, color, bg, filled, title]
  );

  const options = useBaseOptions({ yBeginAtZero: true, showLegend: true });

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} updateMode="none" redraw={false} />
    </ChartCard>
  );
}
