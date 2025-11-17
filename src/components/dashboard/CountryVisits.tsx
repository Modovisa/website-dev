// src/components/dashboard/CountryVisits.tsx

import { useMemo } from "react";

type CountryRow = {
  country: string;
  count: number;
  iso_code?: string | null; // e.g. "US", "JP"
};

type Props = {
  countries: CountryRow[];
  limit?: number; // defaults to 10
};

export default function CountryVisits({ countries = [], limit = 10 }: Props) {
  const rows = useMemo(() => {
    const filtered = (countries || []).filter((r) => (r?.count ?? 0) > 0);
    const sorted = filtered.sort((a, b) => (b.count || 0) - (a.count || 0));
    return sorted.slice(0, limit);
  }, [countries, limit]);

  const total = rows.reduce((s, r) => s + (r.count || 0), 0);

  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No country data yet.</div>;
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header: only Country + Visitors */}
      <div className="grid grid-cols-[1fr,170px] px-4 pb-2 text-muted-foreground text-md font-semibold">
        <div>COUNTRY</div>
        <div className="text-right">VISITORS</div>
      </div>

      {/* Body: rows spread to fill available height */}
      <div
        className="flex-1 grid"
        style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
      >
        {rows.map((r) => {
          const name = r.country || "Unknown";
          const iso = (r.iso_code || "").toLowerCase();
          const count = r.count || 0;
          const pct = total ? (count / total) * 100 : 0;
          const pctText = `${pct.toFixed(1)}%`;

          return (
            <div
              key={`${name}-${iso}`}
              className="grid grid-cols-[1fr,170px] items-center px-4 hover:bg-muted/40"
            >
              {/* Country + flag */}
              <div className="flex items-center gap-2 font-medium">
                {iso ? (
                  <img
                    src={`/assets/flags/4x3/${iso}.svg`}
                    alt={name}
                    width={25}
                    height={20}
                    className="rounded shadow-sm border"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                  />
                ) : null}
                <span>{name}</span>
              </div>

              {/* Visitors column: count + bar + % (Bootstrap-like) */}
              <div className="flex items-center justify-end gap-3">
                <span className="font-semibold tabular-nums">{count.toLocaleString()}</span>
                <div className="relative w-[100px] h-6">
                  {/* bar: #635bff @ 15%, 4px right radius */}
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r-[4px] z-0"
                    style={{ width: `${pct.toFixed(1)}%`, backgroundColor: "#635bff", opacity: 0.15 }}
                  />
                  {/* guide line: #8e8e8e, above bar */}
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-[#8e8e8e] z-10" />
                  {/* percent text on top */}
                  <span className="absolute inset-0 flex items-center justify-end z-20">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
