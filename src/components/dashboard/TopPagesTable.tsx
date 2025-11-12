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
      {/* Header */}
      <div className="grid grid-cols-[1fr,200px] px-4 pb-2 text-muted-foreground text-lg font-semibold">
        <div>Pages</div>
        <div className="text-right">Views</div>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-border rounded-xl border bg-card">
        {rows.map((r) => {
          const rel = (r.url || "/").replace(/^https?:\/\/[^/]+/i, "") || "/";
          const pct = total ? Math.max(0, Math.min(100, (r.views / total) * 100)) : 0;

          return (
            <div key={r.url} className="group grid grid-cols-[1fr,200px] items-center px-4 py-3 hover:bg-muted/50">
              {/* Left: page link */}
              <div className="min-w-0 pr-3">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-foreground truncate max-w-full"
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

              {/* Right: number + bar */}
              <div className="flex items-center justify-end gap-4">
                <span className="font-semibold tabular-nums">{r.views.toLocaleString()}</span>
                <div className="relative w-[110px] h-6">
                  {/* bar */}
                  <div
                    className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-r-[4px] z-0"
                    style={{ width: `${pct.toFixed(1)}%`, backgroundColor: "#635bff", opacity: 0.15 }}
                  />
                  {/* baseline */}
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-px bg-[#8e8e8e] z-10" />
                  {/* percent */}
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
