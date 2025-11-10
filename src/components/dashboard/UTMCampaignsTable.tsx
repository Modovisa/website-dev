// src/components/dashboard/UTMCampaignsTable.tsx

import { memo } from "react";
import type { UTMCampaignRow } from "@/types/dashboard";

function truncateMiddle(s: string, n = 80) {
  if (s.length <= n) return s;
  const keep = Math.floor((n - 3) / 2);
  return s.slice(0, keep) + "..." + s.slice(-keep);
}

export default memo(function UTMCampaignsTable({ rows }: { rows: UTMCampaignRow[] }) {
  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No UTM campaign URLs found</div>;
  }

  const total = rows.reduce((sum, r) => sum + (r.visitors || 0), 0);

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const rel = r.url.replace(/^https?:\/\/[^/]+/, "") || "/";
        const pct = total ? ((r.visitors / total) * 100).toFixed(1) : "0.0";
        return (
          <div
            key={r.url}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
            title={rel}
          >
            <a
              className="text-sm font-medium truncate max-w-[70%]"
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              {truncateMiddle(rel, 80)}
            </a>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{r.visitors.toLocaleString()} visitors</span>
              <span className="text-xs">({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

