// src/components/profile/InvoicesTable.tsx

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Invoice } from "@/services/billing.store";

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

function toSeq(id?: string) {
  const m = String(id || "").match(/(\d+)(?!.*\d)/);
  return m ? parseInt(m[1], 10) : -1;
}

export default function InvoicesTable({ rows }: { rows: Invoice[] }) {
  const sorted = useMemo(() => {
    const withKeys = rows.map((r) => {
      const invoiceId = r.invoice_id || r.number || r.id || "";
      const date = r.issued_date || r.created_at || "";
      const amount = r.total ?? r.amount_due ?? 0;
      const status = r.invoice_status || r.status || "";
      const pdfLink = r.pdf_link || r.invoice_pdf || null;

      return {
        ...r,
        invoiceId,
        date,
        amount,
        status,
        pdfLink,
        issued_ts: toEpoch(date),
        seq: toSeq(invoiceId),
      };
    });
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
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-3 pr-4 font-semibold">Date</th>
                <th className="py-3 pr-4 font-semibold">Amount</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Invoice #</th>
                <th className="py-3 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                    No invoices yet.
                  </td>
                </tr>
              )}
              {sorted.map((r, idx) => (
                <tr key={r.invoiceId || idx} className="border-t hover:bg-muted/50">
                  <td className="py-3 pr-4">{r.date || "—"}</td>
                  <td className="py-3 pr-4 font-medium">
                    {r.amount != null ? `$${Number(r.amount).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        (r.status || "").toLowerCase() === "refunded"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {r.status || "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium">{r.invoiceId || "—"}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {r.pdfLink ? (
                      <a
                        className="inline-flex items-center rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        href={r.pdfLink}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {sorted.length} {sorted.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}