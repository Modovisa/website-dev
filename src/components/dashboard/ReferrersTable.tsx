// src/components/dashboard/ReferrersTable.tsx

import { memo, useMemo } from "react";

export type ReferrerRow = { domain: string; visitors: number };

export default memo(function ReferrersTable({ rows }: { rows: ReferrerRow[] }) {
  const total = useMemo(
    () => rows?.reduce((s, r) => s + (r.visitors || 0), 0) || 0,
    [rows]
  );

  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No referrer data</div>;
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header */}
      <div className="grid grid-cols-[1fr,200px] px-4 pb-2 text-muted-foreground text-lg font-semibold">
        <div>Referrer</div>
        <div className="text-right">Visitors</div>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-border rounded-xl border bg-card">
        {rows.map((r) => {
          const domain = (r.domain || "").toLowerCase();
          const pct = total ? Math.max(0, Math.min(100, (r.visitors / total) * 100)) : 0;
          const icon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

          return (
            <div key={domain} className="group grid grid-cols-[1fr,200px] items-center px-4 py-3 hover:bg-muted/50">
              {/* Left: referrer + icon */}
              <div className="min-w-0 pr-3">
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-foreground truncate max-w-full"
                  title={domain}
                >
                  <img
                    src={icon}
                    width={16}
                    height={16}
                    className="shrink-0 rounded"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                  />
                  <span className="truncate">{domain}</span>
                  <span className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </div>

              {/* Right: number + bar with clean gap */}
              <div className="flex items-center justify-end gap-4">
                <span className="font-semibold tabular-nums">{r.visitors.toLocaleString()}</span>
                <div className="relative w-[110px] h-6">
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r-[4px] z-0"
                    style={{ width: `${pct.toFixed(1)}%`, backgroundColor: "#635bff", opacity: 0.15 }}
                  />
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-[#8e8e8e] z-10" />
                  <span className="absolute inset-0 z-20 flex items-center justify-end tabular-nums">
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
});
