// src/components/dashboard/TopPagesTable.tsx

import { memo, useMemo } from "react";

export type TopPageRow = { url: string; views: number };

export default memo(function TopPagesTable({ rows }: { rows: TopPageRow[] }) {
  const total = useMemo(
    () => rows?.reduce((s, r) => s + (r.views || 0), 0) || 0,
    [rows]
  );

  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No pageviews yet</div>;
  }

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Header — “Pages” | “Views” */}
      <div className="grid grid-cols-[1fr,200px] px-6 pb-3 text-muted-foreground text-md font-bold uppercase tracking-wide">
        <div>Pages</div>
        <div className="text-right">Views</div>
      </div>

      {/* Rows — stretch to fill card height */}
      <div
        className="flex-1 grid"
        style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
      >
        {rows.map((r) => {
          const rel = (r.url || "/").replace(/^https?:\/\/[^/]+/i, "") || "/";
          const pct = total ? Math.max(0, Math.min(100, (r.views / total) * 100)) : 0;

          return (
            <div
              key={r.url}
              className="group grid grid-cols-[1fr,200px] items-center px-6 py-3 hover:bg-muted/40"
            >
              {/* Left: page link */}
              <div className="min-w-0 pr-3">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-base font-medium text-foreground truncate max-w-full"
                  title={rel}
                >
                  <span className="truncate">{rel}</span>
                  <span className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </div>

              {/* Right: number + bar with clear gap before the baseline */}
              <div className="flex items-center justify-end gap-5">
                <span className="font-semibold tabular-nums">{r.views.toLocaleString()}</span>
                <div className="relative w-[120px] h-6">
                  {/* fill */}
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r-[4px]"
                    style={{ width: `${pct.toFixed(1)}%`, backgroundColor: "rgba(99,91,255,0.15)" }}
                  />
                  {/* baseline */}
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-[#8e8e8e]" />
                  {/* % */}
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
  );
});
