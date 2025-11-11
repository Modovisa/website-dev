// src/components/dashboard/CountryVisits.tsx

import { useMemo } from "react";

type Country = { country: string; iso_code?: string; count: number };

type Props = {
  countries: Country[];
  limit?: number;
};

export default function CountryVisits({ countries = [], limit = 10 }: Props) {
  const rows = useMemo(() => {
    const sorted = (countries || [])
      .filter((r) => (r?.count ?? 0) > 0)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);

    const total = sorted.reduce((s, r) => s + (r.count || 0), 0);
    return { sorted, total };
  }, [countries, limit]);

  return (
    <table className="w-full">
      <thead>
        <tr className="text-muted-foreground text-sm">
          <th className="text-left ps-2">Country</th>
          <th className="text-right">Visitors</th>
          <th className="text-right pe-2">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.sorted.map((r, idx) => {
          const pct = rows.total ? ((r.count / rows.total) * 100) : 0;
          const iso = (r.iso_code || "").toLowerCase();
          return (
            <tr key={`${r.country}-${idx}`} className="hover:bg-muted/40">
              <td className="py-2 ps-2">
                <div className="flex items-center gap-2">
                  {iso ? (
                    <img
                      src={`/assets/vendor/fonts/flags/4x3/${iso}.svg`}
                      width={20}
                      height={15}
                      className="rounded-sm"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : null}
                  <span className="font-medium">{r.country || "Unknown"}</span>
                </div>
              </td>
              <td className="text-right font-semibold">{(r.count || 0).toLocaleString()}</td>
              <td className="text-right pe-2">
                <div className="relative inline-block w-24 align-middle">
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-5 rounded-r bg-primary/15"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 h-5 w-px bg-muted-foreground/60" />
                  <span className="relative text-sm">{pct.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          );
        })}
        {rows.sorted.length === 0 && (
          <tr>
            <td colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
              No country data
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
