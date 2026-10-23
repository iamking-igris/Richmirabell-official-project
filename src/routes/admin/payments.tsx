import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { seedPayments } from "@/data/seed-admin";
import { naira } from "@/lib/format";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/admin/payments")({ component: Payments });

function Payments() {
  const local = useSession((s) => s.payments);
  const payments = useMemo(() => [...local, ...seedPayments()].sort((a, b) => b.at - a.at), [local]);
  const ok = payments.filter((p) => p.status === "Successful");
  const failed = payments.length - ok.length;

  function exportCsv() {
    const header = "reference,student,amount,method,date,status";
    const lines = payments.map((p) => [p.reference, p.name, p.amount, p.method, new Date(p.at).toISOString(), p.status].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "richmirabel-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Payments</h1>
        <button type="button" onClick={exportCsv} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold">Export CSV</button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[[naira(ok.reduce((s, p) => s + p.amount, 0)), "this term"], [String(ok.length), "successful"], [String(failed), "failed"]].map(([n, d]) => (
          <div key={d} className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-display text-2xl sm:text-3xl">{n}</p>
            <p className="text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>{["Reference", "Student", "Amount", "Method", "Date", "Status"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.reference}>
                <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{naira(p.amount)}</td>
                <td className="px-4 py-3">{p.method}</td>
                <td className="px-4 py-3">{new Date(p.at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
