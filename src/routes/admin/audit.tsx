import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { loadOps } from "@/lib/admin-ops";

export const Route = createFileRoute("/admin/audit")({ component: Audit });

function Audit() {
  const [events] = useState(() => loadOps().audit);
  return (
    <div>
      <h1 className="font-display text-4xl">Audit & Security</h1>
      <p className="mt-2 text-sm text-muted">Administrative Audit Log. System actions and policy changes are recorded for compliance auditing.</p>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {events.map((e) => (
          <li key={e.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{e.action} · {e.target}</p>
            <p className="text-xs text-muted">{e.actor} · {e.at}{e.reason ? ` · ${e.reason}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
