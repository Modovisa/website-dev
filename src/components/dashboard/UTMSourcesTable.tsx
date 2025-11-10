// src/components/dashboard/UTMSourcesTable.tsx

export default function UTMSourcesTable({ rows }: { rows: { source: string; visitors: number }[] }) {
  if (!rows?.length) return <div className="text-sm text-muted-foreground py-8 text-center">No UTM sources</div>;
  const total = rows.reduce((s, r) => s + (r.visitors || 0), 0);

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = total ? ((r.visitors / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={r.source} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
            <span className="text-sm font-medium">{r.source}</span>
            <span className="text-sm text-muted-foreground">{r.visitors.toLocaleString()} · {pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
