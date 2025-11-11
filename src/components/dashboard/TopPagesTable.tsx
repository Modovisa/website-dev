// src/components/dashboard/TopPagesTable.tsx

import { memo, useMemo } from "react";

export type TopPageRow = { url: string; views: number };

export default memo(function TopPagesTable({ rows }: { rows: TopPageRow[] }) {
  const total = useMemo(() => rows?.reduce((s, r) => s + (r.views || 0), 0) || 0, [rows]);

  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No pageviews yet</div>;
  }

  return (
    <div className="divide-y divide-border rounded-xl border bg-card">
      {rows.map((r) => {
        const rel = (r.url || "/").replace(/^https?:\/\/[^/]+/i, "") || "/";
        const pct = total ? Math.max(0, Math.min(100, (r.views / total) * 100)) : 0;

        return (
          <div
            key={r.url}
            className="group flex items-center px-4 py-3 hover:bg-muted/50"
          >
            {/* Page (left) */}
            <div className="flex-1 min-w-0 pr-3">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground truncate max-w-full"
                title={rel}
              >
                <span className="truncate">{rel}</span>
                {/* external icon */}
                <span className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </a>
            </div>

            {/* Views (middle) */}
            <div className="w-24 text-right text-sm font-semibold tabular-nums">{r.views.toLocaleString()}</div>

            {/* Percent bar (right) */}
            <div className="relative w-28 pl-4 text-right text-sm">
              {/* pastel bar */}
              <div
                className="absolute top-1/2 left-0 h-6 -translate-y-1/2 rounded-r"
                style={{
                  width: `${pct.toFixed(1)}%`,
                  backgroundColor: "hsl(var(--primary) / 0.15)",
                }}
              />
              {/* vertical baseline tick */}
              <div className="absolute top-1/2 left-0 h-6 w-px -translate-y-1/2 bg-muted-foreground/40" />
              <span className="relative z-10 tabular-nums">{pct.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
