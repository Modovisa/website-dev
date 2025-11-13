// src/components/profile/InvoicesTable.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvoiceRow } from "@/services/billingService";

function toEpoch(d?: string) {
  if (!d) return 0;
  const t = Date.parse(d);
  if (!Number.isNaN(t)) return t;
  const m = String(d).match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return 0;
  const months: Record<string, number> = {
    Jan: 0, January: 0, Feb: 1, February: 1, Mar: 2, March: 2, Apr: 3, April: 3, May: 4, Jun: 5, June: 5, Jul: 6, July: 6,
    Aug: 7, August: 7, Sep: 8, Sept: 8, September: 8, Oct: 9, October: 9, Nov: 10, November: 10, Dec: 11, December: 11,
  };
  const mm = months[m[1]];
  if (mm == null) return 0;
  return Date.UTC(parseInt(m[3], 10), mm, parseInt(m[2], 10));
}

export default function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const sorted = useMemo(() => {
    const withKeys = rows.map((r) => ({
      ...r,
      issued_ts: toEpoch(r.issued_date),
      seq: parseInt((r.invoice_id.match(/(\d+)(?!.*\d)/) || [])[1] || "-1", 10),
    }));
    return withKeys.sort((a, b) => b.issued_ts - a.issued_ts || b.seq - a.seq);
  }, [rows]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Invoice #</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td className="py-6 text-muted-foreground" colSpan={5}>
                    No invoices yet.
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.invoice_id} className="border-t">
                  <td className="py-3 pr-4">{r.issued_date || "—"}</td>
                  <td className="py-3 pr-4">{r.total != null ? `$${Number(r.total).toFixed(2)}` : "—"}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        (r.invoice_status || "").toLowerCase() === "refunded"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {r.invoice_status || "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium">{r.invoice_id || "—"}</td>
                  <td className="py-3 pr-4">
                    {r.pdf_link ? (
                      <a className="underline" href={r.pdf_link} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
