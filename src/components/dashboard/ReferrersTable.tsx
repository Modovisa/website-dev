// src/components/dashboard/ReferrersTable.tsx

import { memo, useMemo } from "react";
import { ChartCard } from "./ChartKit";

export type ReferrerRow = { domain: string; visitors: number };

export default memo(function ReferrersTable({ rows }: { rows: ReferrerRow[] }) {
  const total = useMemo(
    () => rows?.reduce((s, r) => s + (r.visitors || 0), 0) || 0,
    [rows]
  );

  const hasData = !!(rows && rows.length);

  return (
    <ChartCard
      title="Referrers"
      info="Breakdown of external sites that sent visitors to you. Useful for traffic source attribution."
      hasData={hasData}
      height={360}
    >
      {!hasData ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No referrer data
        </div>
      ) : (
        <div className="h-full flex flex-col text-sm">
          {/* Header — “Referrer” | “Visitors” */}
          <div className="grid grid-cols-[1fr,200px] px-6 pb-3 text-muted-foreground text-md font-bold uppercase tracking-wide">
            <div>Referrer</div>
            <div className="text-right">Visitors</div>
          </div>

          {/* Rows — stretch to fill card height */}
          <div
            className="flex-1 grid"
            style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
          >
            {rows.map((r) => {
              const domain = (r.domain || "").toLowerCase();
              const pct = total
                ? Math.max(0, Math.min(100, (r.visitors / total) * 100))
                : 0;
              const icon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

              return (
                <div
                  key={domain}
                  className="group grid grid-cols-[1fr,200px] items-center px-6 py-3 hover:bg-muted/40"
                >
                  {/* Left: referrer + icon */}
                  <div className="min-w-0 pr-3">
                    <a
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-base font-medium text-foreground truncate max-w-full"
                      title={domain}
                    >
                      <img
                        src={icon}
                        width={20}
                        height={20}
                        className="shrink-0 rounded"
                        onError={(e) =>
                          ((e.currentTarget as HTMLImageElement).style.display =
                            "none")
                        }
                      />
                      <span className="truncate">{domain}</span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline
                            points="15 3 21 3 21 9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <line
                            x1="10"
                            y1="14"
                            x2="21"
                            y2="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </a>
                  </div>

                  {/* Right: number + bar with clean gap */}
                  <div className="flex items-center justify-end gap-5">
                    <span className="font-semibold tabular-nums">
                      {r.visitors.toLocaleString()}
                    </span>
                    <div className="relative w-[120px] h-6">
                      <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r-[4px]"
                        style={{
                          width: `${pct.toFixed(1)}%`,
                          backgroundColor: "rgba(99,91,255,0.15)",
                        }}
                      />
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-[#8e8e8e]" />
                      <span className="absolute inset-0 flex items-center justify-end tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartCard>
  );
});
