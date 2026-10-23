import { createFileRoute, Link } from "@tanstack/react-router";
import { availableSubjects, useContent } from "@/lib/content";
import { demoWaecPapers } from "@/data/demo";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/cbt")({ component: CbtPage });

function CbtPage() {
  const available = availableSubjects(useContent((s) => s.subjects));
  const exams = useSession((s) => s.exams);
  const jamb = useSession((s) => s.jambSubjects);
  const demoMode = useSession((s) => s.demoMode);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">Take CBT</h1>
      <p className="mt-2 text-muted">Three separate experiences. Topic practice uses the loaded subject notes. WAEC and JAMB demos are synthetic test papers, not official examinations.</p>
      <ul className="mt-6 space-y-3">
        <li className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">Open</p>
          <h2 className="mt-1 font-display text-2xl">Topic Practice</h2>
          <p className="mt-2 text-sm text-muted">Short sets on any loaded subject topic. Not a full exam.</p>
          {available.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {available.slice(0, 4).map((subject) => (
                <Link key={subject.id} to="/studio/subject/$id" params={{ id: subject.id }} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold text-primary">
                  {subject.name}
                </Link>
              ))}
            </div>
          ) : null}
        </li>
        <li className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">{demoMode ? "Demo open" : "Demo"}</p>
          <h2 className="mt-1 font-display text-2xl">WAEC past papers</h2>
          <p className="mt-2 text-sm text-muted">
            {demoMode ? "Synthetic WAEC-style papers for UI testing. Clearly labelled DEMO — not authentic past papers." : "Turn on Demo mode in Account to exercise the WAEC workflow with synthetic papers."}
          </p>
          {demoMode ? (
            <ul className="mt-3 space-y-2">
              {demoWaecPapers.map((p) => (
                <li key={p.id}>
                  <Link to="/studio/cbt/waec/$paperId" params={{ paperId: p.id }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">{p.title} →</Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link to="/studio/account" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open Account / demo controls</Link>
          )}
        </li>
        <li className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold text-primary">{demoMode ? "Demo open" : "Demo"}</p>
          <h2 className="mt-1 font-display text-2xl">Full JAMB CBT</h2>
          <p className="mt-2 text-sm text-muted">
            {demoMode ? "A timed 40-question demo paper (English + three subjects) with synthetic items. Not an official JAMB simulation." : "Turn on Demo mode in Account to run a synthetic JAMB CBT session."}
          </p>
          {exams.includes("jamb") && jamb.length === 3 ? (
            <p className="mt-1 text-xs text-muted">Your combination: English, {jamb.join(", ")}.</p>
          ) : (
            <p className="mt-1 text-xs text-muted">Optional: set your four subjects in Account. Demo still runs with a standard set.</p>
          )}
          {demoMode ? (
            <Link to="/studio/cbt/jamb" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Start demo JAMB CBT</Link>
          ) : (
            <Link to="/studio/account" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open Account / demo controls</Link>
          )}
        </li>
      </ul>
    </div>
  );
}
