import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { monthOptions } from "@/components/subject-picker";
import { AVAILABLE_SUBJECT_IDS, JAMB_OPTIONAL_IDS, publishedSubjects, useContent } from "@/lib/content";
import { monthLabel } from "@/lib/format";
import { useSession, type Exam } from "@/lib/session";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const done = useSession((s) => s.onboardingComplete);
  const complete = useSession((s) => s.completeOnboarding);
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const [step, setStep] = useState(0);
  const [exams, setExams] = useState<Exam[]>(["jamb"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [unsure, setUnsure] = useState(true);

  if (!name) return <Navigate to="/create-account" />;
  if (done) return <Navigate to="/studio" />;

  const first = name.split(" ")[0];
  const needsJamb = exams.includes("jamb");
  const steps = needsJamb ? ["Exams", "JAMB subjects", "Exam date", "Ready"] : ["Exams", "Exam date", "Ready"];
  const months = monthOptions();
  const optional = JAMB_OPTIONAL_IDS.map((id) => subjects.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  function toggleExam(exam: Exam) {
    setExams((current) => (current.includes(exam) ? current.filter((e) => e !== exam) : [...current, exam]));
  }

  function toggleSubject(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : current.length >= 3 ? current : [...current, id]));
  }

  function finish() {
    complete({ exams, jambSubjects: needsJamb ? picked : [], examMonth: unsure ? null : month });
    navigate({ to: "/studio" });
  }

  const dateStep = needsJamb ? 2 : 1;
  const reviewStep = needsJamb ? 3 : 2;
  const canContinue = step === 0 ? exams.length > 0 : step === 1 && needsJamb ? picked.length === 3 : true;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <BrandMark />
          <span className="text-sm text-muted">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="h-1 bg-soft" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 pb-28">
        {step === 0 && (
          <>
            <h1 className="font-display text-4xl">What are you preparing for, {first}?</h1>
            <p className="mt-3 text-muted">Pick WAEC, JAMB, or both. The demo subject bank is open across the catalog.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {(["waec", "jamb"] as const).map((exam) => (
                <button key={exam} type="button" onClick={() => toggleExam(exam)} className={`min-h-24 rounded-2xl border p-5 text-left ${exams.includes(exam) ? "border-primary bg-surface ring-2 ring-primary" : "border-line bg-surface"}`}>
                  <span className="font-display text-2xl uppercase">{exam}</span>
                  <span className="mt-1 block text-sm text-muted">{exam === "waec" ? "Science subjects as they are ready" : "Use of English plus three subjects"}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {needsJamb && step === 1 && (
          <>
            <h1 className="font-display text-4xl">Your JAMB combination</h1>
            <p className="mt-3 text-muted">Use of English is compulsory. Pick three more. The demo notes and quizzes are available across the subject set.</p>
            <div className="mt-6 rounded-2xl border border-primary bg-soft p-4">
              <p className="font-medium">Use of English</p>
              <p className="text-sm text-muted">Compulsory. Notes are still being prepared.</p>
            </div>
            <ul className="mt-3 space-y-2">
              {optional.map((subject) => {
                const on = picked.includes(subject.id);
                const ready = AVAILABLE_SUBJECT_IDS.has(subject.id);
                return (
                  <li key={subject.id}>
                    <button type="button" onClick={() => toggleSubject(subject.id)} className={`flex w-full min-h-14 items-center justify-between rounded-2xl border px-4 text-left ${on ? "border-primary bg-surface" : "border-line bg-surface"}`}>
                      <span>
                        <span className="block font-medium">{subject.name}</span>
                        <span className="text-sm text-muted">{ready ? "Open now" : "In preparation"}</span>
                      </span>
                      <span className="text-sm">{on ? "Selected" : "Add"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-muted">{picked.length} of 3 selected.</p>
          </>
        )}
        {step === dateStep && (
          <>
            <h1 className="font-display text-4xl">When is your exam?</h1>
            <p className="mt-3 text-muted">Optional. Skip this if you are not sure yet.</p>
            <label className="mt-8 block text-sm font-medium" htmlFor="month">Exam month</label>
            <select id="month" disabled={unsure} value={month ?? ""} onChange={(e) => setMonth(e.target.value || null)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-3 disabled:opacity-50">
              <option value="">Choose a month</option>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={unsure} onChange={(e) => setUnsure(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
              I'm not sure yet
            </label>
          </>
        )}
        {step === reviewStep && (
          <>
            <h1 className="font-display text-4xl">You're set, {first}.</h1>
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted">Exams</dt><dd className="font-medium">{exams.map((e) => e.toUpperCase()).join(" and ")}</dd></div>
                {needsJamb && <div className="flex justify-between gap-4"><dt className="text-muted">JAMB subjects</dt><dd className="text-right font-medium">English, {picked.map((id) => subjects.find((s) => s.id === id)?.name ?? id).join(", ")}</dd></div>}
                <div className="flex justify-between gap-4"><dt className="text-muted">Open now</dt><dd className="font-medium">Physics, Chemistry, Biology, and Mathematics</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Exam date</dt><dd className="font-medium">{unsure || !month ? "Not set" : monthLabel(month)}</dd></div>
              </dl>
            </div>
            <p className="mt-4 text-sm text-muted">Demo JAMB CBT and WAEC past-paper flows are enabled, with the practice bank loaded across all subjects.</p>
          </>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="min-h-12 rounded-full border border-line px-6 text-sm font-semibold">Back</button>
          ) : (
            <Link to="/" className="min-h-12 px-2 text-sm leading-[3rem] text-muted">Cancel</Link>
          )}
          {step < reviewStep ? (
            <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className="min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg disabled:opacity-40">Continue</button>
          ) : (
            <button type="button" onClick={finish} className="min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg">Open my dashboard</button>
          )}
        </div>
      </div>
    </div>
  );
}
