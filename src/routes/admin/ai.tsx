import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { loadOps, saveOps, type DemoJob } from "@/lib/admin-ops";

export const Route = createFileRoute("/admin/ai")({ component: AiOps });

function AiOps() {
  const [jobs, setJobs] = useState<DemoJob[]>(() => loadOps().jobs);

  function retry(id: string) {
    const next = jobs.map((j) => (j.id === id ? { ...j, status: "Needs review" as const } : j));
    setJobs(next);
    const ops = loadOps();
    ops.jobs = next;
    ops.audit = [{ id: `a_${Date.now()}`, actor: "admin", action: "Retried import job", target: id, at: new Date().toLocaleString("en-NG") }, ...ops.audit];
    saveOps(ops);
  }

  return (
    <div>
      <h1 className="font-display text-4xl">AI Operations</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Queue for notes and quiz imports. Processing jobs will be handled by the OCR service integration layer.</p>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {jobs.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span>{j.id} · {j.type} · {j.pages} pages · {j.status}</span>
            {j.status === "Failed" && <button type="button" onClick={() => retry(j.id)} className="min-h-10 rounded-full border border-line px-3">Retry</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
