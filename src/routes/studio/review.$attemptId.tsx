import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { keyLabel } from "@/lib/assessment";
import { findAttempt, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/review/$attemptId")({ component: ReviewPage });

function ReviewPage() {
  const { attemptId } = Route.useParams();
  const attempts = useSession((s) => s.attempts);
  const attempt = findAttempt(attempts, attemptId);

  if (!attempt) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">Attempt not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been cleared or never saved on this device.</p>
        <Link to="/studio/progress" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Progress</Link>
      </div>
    );
  }

  const kindLabel = attempt.kind === "jamb" ? "JAMB CBT" : attempt.kind === "waec" ? "WAEC paper" : "Topic quiz";

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/studio/progress" className="text-sm font-semibold text-primary">← Progress</Link>
      <p className="mt-4 text-xs font-semibold text-primary">{kindLabel}{attempt.demo ? " · DEMO" : ""}</p>
      <h1 className="mt-1 font-display text-4xl">{attempt.title}</h1>
      <p className="mt-2 text-muted">Score {attempt.score}/{attempt.total}{attempt.subjectLabel ? ` · ${attempt.subjectLabel}` : ""} · {new Date(attempt.at).toLocaleString()}</p>
      {!attempt.items?.length && <p className="mt-6 text-sm text-muted">This attempt was saved before answer snapshots were stored. Score is kept; item-level review is unavailable.</p>}
      <ul className="mt-6 space-y-4">
        {attempt.items?.map((item, i) => {
          if (item.theory) {
            return (
              <li key={item.id} className="rounded-2xl border border-dashed border-line bg-surface p-4">
                <p className="text-sm text-muted">Theory {i + 1}</p>
                <p className="mt-1 font-medium">{item.prompt}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{item.written?.trim() || "No response"}</p>
                {item.modelAnswer && <p className="mt-2 rounded-xl bg-soft px-3 py-2 text-sm text-muted"><span className="font-semibold">Demo model answer: </span>{item.modelAnswer}</p>}
              </li>
            );
          }
          const ok = item.answer != null && item.pick === item.answer;
          return (
            <li key={item.id} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm text-muted">Q{i + 1}</p>
              <p className="mt-1 font-medium">{item.prompt}</p>
              <p className="mt-2 flex items-center gap-2 text-sm">
                {item.answer != null ? ok ? <Check className="size-4 text-primary" /> : <X className="size-4" /> : null}
                Your answer: {item.pick ?? "—"}{item.answer != null ? ` · Key: ${item.answer}` : ""}{item.answerKeyStatus ? ` · ${keyLabel(item.answerKeyStatus)}` : ""}
              </p>
              {item.explain && <p className="mt-2 text-sm text-muted">{item.explain}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
