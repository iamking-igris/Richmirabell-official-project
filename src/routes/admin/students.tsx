import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { seedStudents, type StudentRow } from "@/data/seed-admin";
import { tracks } from "@/data/tracks";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/content";
import { bestByTopic, trialLeft, useSession } from "@/lib/session";

export const Route = createFileRoute("/admin/students")({ component: Students });

const filters = ["All", "Trial", "Paid", "Expired"] as const;

function ago(days: number) {
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

function Students() {
  const session = useSession();
  const subjects = useContent((s) => s.subjects);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const local: StudentRow[] = session.name
      ? [
          (() => {
            const best = [...bestByTopic(session.attempts).values()];
            const t = trialLeft(session.trialStart, session.subscribed);
            return {
              id: "local",
              name: session.name,
              pathway: session.pathway ?? "sciences",
              subjects: session.selectedSubjects,
              status: session.subscribed ? "Paid" : t.active ? "Trial" : "Expired",
              joinedDaysAgo: session.trialStart ? Math.floor((Date.now() - session.trialStart) / 86_400_000) : 0,
              activeDaysAgo: session.attempts[0] ? Math.floor((Date.now() - session.attempts[0].at) / 86_400_000) : 0,
              topics: best.length,
              avg: best.length ? Math.round((best.reduce((a, x) => a + x.score / x.total, 0) / best.length) * 100) : 0,
            } as StudentRow;
          })(),
        ]
      : [];
    return [...local, ...seedStudents];
  }, [session]);

  const shown = rows.filter((r) => (filter === "All" || r.status === filter) && r.name.toLowerCase().includes(q.toLowerCase()));
  const nameOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <div>
      <h1 className="font-display text-4xl">Students</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("min-h-11 rounded-full border px-4 text-sm", filter === f ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface")}>
            {f} {f === "All" ? rows.length : rows.filter((r) => r.status === f).length}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search students" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3 sm:max-w-xs" />
      </div>
      {shown.length === 0 ? (
        <p className="mt-6 text-muted">No students match. Clear the search or pick another filter.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                {["Name", "Class", "Status", "Topics", "Average", "Last active"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => (
                <Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-paper" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className="px-4 py-3 font-medium">
                      <button type="button" aria-expanded={open === r.id} className="min-h-11 text-left">{r.name}</button>
                    </td>
                    <td className="px-4 py-3">{tracks[r.pathway].label}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3">{r.topics}</td>
                    <td className="px-4 py-3">{r.topics ? `${r.avg}%` : "None yet"}</td>
                    <td className="px-4 py-3">{ago(r.activeDaysAgo)}</td>
                  </tr>
                  {open === r.id && (
                    <tr className="bg-paper">
                      <td colSpan={6} className="px-4 py-3 text-muted">
                        Subjects: {r.subjects.map(nameOf).join(", ") || "Not chosen yet"} · Joined {ago(r.joinedDaysAgo).toLowerCase()}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
