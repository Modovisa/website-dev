// src/components/dashboard/UTMSourcesTable.tsx

import { memo } from "react";
import type { UTMSrcRow } from "@/types/dashboard";

/** crude domain detector: if it has a dot, treat as domain; else hide icon */
function isDomainLike(s: string) {
  return /\./.test(s);
}

export default memo(function UTMSourcesTable({ rows }: { rows: UTMSrcRow[] }) {
  if (!rows?.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No referrer data</div>;
  }
  const total = rows.reduce((s, r) => s + (r.visitors || 0), 0);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = total ? ((r.visitors / total) * 100).toFixed(1) : "0.0";
        const showIcon = isDomainLike(r.source);
        const href = showIcon ? `https://${r.source}` : "#";
        const icon = showIcon ? `https://icons.duckduckgo.com/ip3/${r.source}.ico` : "";

        return (
          <div key={r.source} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {showIcon ? (
                <img
                  src={icon}
                  width={16}
                  height={16}
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              ) : null}
              <a className="text-sm font-medium" href={href} target={showIcon ? "_blank" : undefined} rel="noreferrer">
                {r.source}
              </a>
            </div>
            <div className="text-sm text-muted-foreground">
              {r.visitors.toLocaleString()} <span className="text-xs">({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
