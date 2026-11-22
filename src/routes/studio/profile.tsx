import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { monthOptions } from "@/components/subject-picker";
import { monthLabel } from "@/lib/format";
import { subjectMeta } from "@/lib/mappers";
import { useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/studio/profile")({ component: Profile });

export type Exam = "jamb" | "waec";

function Profile() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const profile = useSession((s) => s.profile);
  const status = useSession((s) => s.status);
  const update = useSession((s) => s.updateProfile);
  const [pickedExams, setPickedExams] = useState<Exam[]>(
    profile ? (profile.exams as Exam[]) : ["jamb"],
  );
  const [picked, setPicked] = useState<string[]>(
    profile ? profile.selectedSubjects : ["english", "mathematics", "physics", "chemistry"],
  );
  const [month, setMonth] = useState(profile ? (profile.examMonth ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsJamb = pickedExams.includes("jamb");
  const optional = ["mathematics", "physics", "chemistry", "biology"].map((id) => ({
    id,
    name: subjectMeta(id).name,
  }));

  function toggleExam(exam: Exam) {
    setPickedExams((current) =>
      current.includes(exam) ? current.filter((e) => e !== exam) : [...current, exam],
    );
  }
  function toggleSubject(id: string) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await update({
        exams: pickedExams,
        jambSubjects: needsJamb ? picked : [],
        examMonth: month ?? null,
        name,
      });
      navigate({ to: "/studio" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <h1 className="font-display text-4xl">Loading your profile…</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/studio" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        Back to dashboard
      </Link>
      <h1 className="mt-2 font-display text-4xl">Your plan</h1>
      <p className="mt-2 text-muted">
        Changing this does not delete your scores. Use of English is compulsory for JAMB; pick three more elective subjects.
      </p>
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      <h2 className="mt-8 font-display text-2xl">Exams</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["waec", "jamb"] as const).map((exam) => (
          <button
            key={exam}
            type="button"
            disabled={busy}
            onClick={() => toggleExam(exam)}
            className={`min-h-20 rounded-2xl border p-4 text-left disabled:opacity-50 ${
              pickedExams.includes(exam) ? "border-primary bg-soft" : "border-line bg-surface"
            }`}
          >
            <span className="font-display text-xl uppercase">{exam}</span>
          </button>
        ))}
      </div>
      {needsJamb && (
        <>
          <h2 className="mt-8 font-display text-2xl">JAMB subjects</h2>
          <p className="mt-1 text-sm text-muted">
            Use of English is compulsory. Pick three more from the backend subjects.
          </p>
          <ul className="mt-3 space-y-2">
            {optional.map((subject) => (
              <li key={subject.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleSubject(subject.id)}
                  className={`flex w-full min-h-14 items-center justify-between rounded-2xl border px-4 text-left disabled:opacity-50 ${
                    picked.includes(subject.id) ? "border-primary bg-surface" : "border-line bg-surface"
                  }`}
                >
                  <span>
                    <span className="block font-medium">{subject.name}</span>
                    <span className="text-sm text-muted">{picked.includes(subject.id) ? "Selected" : "Add"}</span>
                  </span>
                  <span className="text-sm">{picked.includes(subject.id) ? "Selected" : "Add"}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mt-8 font-display text-2xl">Exam month</h2>
      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Exam month"
        disabled={busy}
        className="mt-3 min-h-12 w-full rounded-xl border border-line bg-surface px-3 disabled:opacity-50"
      >
        <option value="">Not set</option>
        {monthOptions().map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || pickedExams.length === 0 || (needsJamb && picked.length !== 3)}
        onClick={save}
        className="mt-8 min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
