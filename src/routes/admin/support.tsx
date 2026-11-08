import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { loadOps, saveOps, type DemoTicket } from "@/lib/admin-ops";

export const Route = createFileRoute("/admin/support")({ component: Support });

function Support() {
  const [tickets, setTickets] = useState<DemoTicket[]>(() => loadOps().tickets);

  function close(id: string) {
    const next = tickets.map((t) => (t.id === id ? { ...t, status: "Closed" as const } : t));
    setTickets(next);
    const ops = loadOps();
    ops.tickets = next;
    ops.audit = [{ id: `a_${Date.now()}`, actor: "admin", action: "Closed ticket", target: id, at: new Date().toLocaleString("en-NG") }, ...ops.audit];
    saveOps(ops);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Support</h1>
      <p className="mt-2 text-sm text-muted">Support tickets. Closing a ticket is recorded in the administrative audit log.</p>
      <ul className="mt-4 space-y-3">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t.id} · {t.category} · {t.priority}</p>
              <span className="text-xs">{t.status}</span>
            </div>
            <p className="mt-1 font-medium">{t.user}</p>
            <p className="mt-1 text-sm text-muted">{t.body}</p>
            {t.status !== "Closed" && <button type="button" onClick={() => close(t.id)} className="mt-3 min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg">Close</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
