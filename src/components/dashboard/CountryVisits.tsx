// src/components/dashboard/CountryVisits.tsx

import { useMemo } from "react";

type CountryRow = {
  country: string;
  count: number;
  iso_code?: string | null; // e.g. "US", "JP"
};

type Props = {
  countries: CountryRow[];
  limit?: number; // optional, defaults to 10
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
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground">
          <th className="text-left ps-4">Country</th>
          <th className="text-right">Visitors</th>
          <th className="text-right pe-6">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const name = r.country || "Unknown";
          const iso = (r.iso_code || "").toLowerCase();
          const count = r.count || 0;
          const pct = total ? (count / total) * 100 : 0;

          return (
            <tr key={`${name}-${iso}`} className="group hover:bg-muted/40">
              <td className="py-2 ps-4">
                <div className="flex items-center gap-2 font-medium">
                  {iso ? (
                    <img
                      src={`/assets/flags/4x3/${iso}.svg`}
                      alt={name}
                      width={20}
                      height={15}
                      className="rounded-sm"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  <span>{name}</span>
                </div>
              </td>
              <td className="py-2 text-right font-semibold whitespace-nowrap">
                {count.toLocaleString()}
              </td>
              <td className="py-2 pe-6 text-right relative w-[110px]">
                <div
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r"
                  style={{ width: `${pct.toFixed(1)}%`, backgroundColor: "rgba(99,91,255,0.15)" }}
                />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-muted-foreground/60" />
                <span className="relative z-10">{pct.toFixed(1)}%</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
