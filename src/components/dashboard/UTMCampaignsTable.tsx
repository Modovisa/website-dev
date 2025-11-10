// src/components/dashboard/UTMCampaignsTable.tsx

import { truncateMiddle } from '@/lib/format';

export default function UTMCampaignsTable({ rows }: { rows: { url: string; visitors: number }[] }) {
  if (!rows?.length) return <div className="text-sm text-muted-foreground py-8 text-center">No UTM campaign URLs found</div>;
  const total = rows.reduce((s, r) => s + (r.visitors || 0), 0);

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const rel = r.url.replace(/^https?:\/\/[^/]+/, '') || '/';
        const pct = total ? ((r.visitors / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={r.url} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
            <span className="text-sm font-medium truncate max-w-[70%]" title={rel}>{truncateMiddle(rel, 70)}</span>
            <span className="text-sm text-muted-foreground">{r.visitors.toLocaleString()} · {pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
