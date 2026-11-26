import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand";
import { publishedSubjects, useContent } from "@/lib/content";
import {
  isValidExamMonth,
  isValidJambSelection,
  normalizeJambSelection,
  toggleSelectedExam,
  JAMB_SELECTABLE_SUBJECT_IDS,
  JAMB_SELECTABLE_SUBJECT_LABELS,
  type OnboardingExam,
} from "@/lib/onboarding";
import { useSession } from "@/lib/session";


export const Route = createFileRoute("/start")({ component: StartFlow });

const COMPULSORY_SUBJECT = "english";
const STORAGE_KEY = "richmirabel-start-draft";
const stepTitles = ["Examination", "JAMB subjects", "Exam date", "Ready"];

type Draft = {
  exams: OnboardingExam[];
  subjects: string[];
  examMonth: string | null;
  step: number;
};

function StartFlow() {
  const navigate = useNavigate();
  const existingSubjects = useSession((s) => s.subjects);
  const existingExams = useSession((s) => s.exams);
  const existingExamMonth = useSession((s) => s.examMonth);
  const completeOnboarding = useSession((s) => s.completeOnboarding);
  const sessionStatus = useSession((s) => s.status);
  const sessionUser = useSession((s) => s.user);
  const onboardingComplete = useSession((s) => s.onboardingComplete);
  const sessionRole = useSession((s) => s.role);
  const subjects = publishedSubjects(useContent((s) => s.subjects));

  const [draft, setDraft] = useState<Draft>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    let parsed: Partial<Draft> = {};
    try {
      parsed = saved ? (JSON.parse(saved) as Partial<Draft>) : {};
    } catch {
      parsed = {};
    }

    const savedExams = Array.isArray((parsed as Partial<Draft>).exams)
      ? (parsed as Partial<Draft>).exams!.filter((exam) => exam === "waec" || exam === "jamb")
      : existingExams.filter((exam) => exam === "waec" || exam === "jamb") as OnboardingExam[];

    const savedSubjects = Array.isArray(parsed.subjects) ? parsed.subjects : existingSubjects;
    return {
      exams: [...new Set(savedExams)],
      subjects: savedSubjects,
      examMonth: parsed.examMonth ?? existingExamMonth ?? null,
      step: typeof parsed.step === "number" ? Math.min(3, Math.max(0, parsed.step)) : 0,
    };
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  useEffect(() => {
    if (sessionStatus === "idle") void useSession.getState().restore().catch(() => undefined);
  }, [sessionStatus]);

  useEffect(() => {
    if (!useContent.getState().loaded && !useContent.getState().loading) {
      void useContent.getState().refresh().catch(() => undefined);
    }
  }, []);

  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const optionalSubjects = useMemo(
    () => JAMB_SELECTABLE_SUBJECT_IDS.map((id) => ({
      id,
      name: JAMB_SELECTABLE_SUBJECT_LABELS[id],
    })),
    [],
  );
  const availableIds = useMemo(() => [COMPULSORY_SUBJECT, ...JAMB_SELECTABLE_SUBJECT_IDS], []);
  const normalizedJambSubjects = normalizeJambSelection(draft.subjects, availableIds);

  const canContinue =
    draft.step === 0
      ? draft.exams.length > 0
      : draft.step === 1
        ? !draft.exams.includes("jamb") || isValidJambSelection(draft.subjects, availableIds)
        : draft.step === 2
          ? isValidExamMonth(draft.examMonth)
          : true;

  const toggleExam = (exam: OnboardingExam) => {
    setError("");
    setDraft((current) => {
      const exams = toggleSelectedExam(current.exams, exam);
      return {
        ...current,
        exams,
        subjects: exams.includes("jamb")
          ? normalizeJambSelection(current.subjects, availableIds)
          : current.subjects,
      };
    });
  };

  const toggleSubject = (subjectId: string) => {
    if (subjectId === COMPULSORY_SUBJECT) return;
    setDraft((current) => {
      const selected = normalizeJambSelection(current.subjects, availableIds).filter((id) => id !== COMPULSORY_SUBJECT);
      const next = selected.includes(subjectId)
        ? selected.filter((id) => id !== subjectId)
        : selected.length < 3
          ? [...selected, subjectId]
          : selected;
      return { ...current, subjects: normalizeJambSelection(next, availableIds) };
    });
  };

  const handleBack = () =>
    setDraft((current) => ({
      ...current,
      step:
        current.step === 3
          ? 2
          : current.step === 2
            ? current.exams.includes("jamb") ? 1 : 0
            : Math.max(0, current.step - 1),
    }));

  const submit = async () => {
    if (submitting) return;
    if (!draft.exams.length) return;
    if (draft.exams.includes("jamb") && !isValidJambSelection(draft.subjects, availableIds)) {
      setError("Choose exactly three subjects alongside compulsory English.");
      return;
    }
    if (draft.examMonth && !isValidExamMonth(draft.examMonth)) {
      setError("Select a valid examination month, or leave it blank.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await completeOnboarding({
        name: sessionUser?.name,
        exams: draft.exams,
        jambSubjects: draft.exams.includes("jamb")
          ? normalizedJambSubjects.filter((id) => id !== COMPULSORY_SUBJECT)
          : [],
        examMonth: draft.examMonth || null,
        subjects: draft.exams.includes("jamb")
          ? normalizedJambSubjects
          : [COMPULSORY_SUBJECT],
      });
      window.localStorage.removeItem(STORAGE_KEY);
      await navigate({ to: "/studio", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your setup. Try again.");
      setSubmitting(false);
    }
  };

  if (sessionStatus === "idle" || sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center">
          <BrandMark />
          <p className="mt-5 text-sm text-muted">Loading your account…</p>
        </div>
      </div>
    );
  }
  if (!sessionUser) return <Navigate to="/login" />;
  if (sessionRole === "ADMIN") return <Navigate to="/admin" />;
  if (onboardingComplete) return <Navigate to="/studio" />;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <BrandMark />
          <span className="text-sm text-muted">{stepTitles[draft.step]}</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6">
        <div className="h-2 overflow-hidden rounded-full bg-soft">
          <div className="h-full bg-primary transition-all" style={{ width: `${((draft.step + 1) / stepTitles.length) * 100}%` }} />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-16">
        {draft.step === 0 && (
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-brass">Step 1</p>
            <h1 className="mt-2 font-display text-4xl">What exam are you preparing for?</h1>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => toggleExam("waec")} className={`min-h-[120px] rounded-2xl border p-5 text-left ${draft.exams.includes("waec") ? "border-primary bg-soft" : "border-line bg-surface"}`}>
                <p className="font-display text-2xl">WAEC</p>
                <p className="mt-2 text-sm text-muted">West African Examination Council</p>
              </button>
              <button type="button" onClick={() => toggleExam("jamb")} className={`min-h-[120px] rounded-2xl border p-5 text-left ${draft.exams.includes("jamb") ? "border-primary bg-soft" : "border-line bg-surface"}`}>
                <p className="font-display text-2xl">JAMB</p>
                <p className="mt-2 text-sm text-muted">Joint Admissions and Matriculation Board</p>
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            <div className="mt-8 flex gap-3">
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: current.exams.includes("jamb") ? 1 : 2 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 1 && draft.exams.includes("jamb") && (
          <div>
            <p className="text-sm text-brass">Step 2</p>
            <h1 className="mt-2 font-display text-4xl">Choose your JAMB subjects</h1>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
              <div>
                <p className="font-medium">Use of English</p>
                <p className="text-sm text-muted">Compulsory</p>
              </div>
              <span className="rounded-full bg-soft px-2 py-1 text-xs font-medium text-primary">Locked</span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="font-medium">{normalizedJambSubjects.length - 1} of 3 chosen</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {optionalSubjects.map((subject) => {
                const selected = normalizedJambSubjects.includes(subject.id);
                const atLimit = normalizedJambSubjects.length >= 4;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && atLimit}
                    onClick={() => toggleSubject(subject.id)}
                    className={`min-h-16 rounded-2xl border px-4 py-3 text-left disabled:opacity-50 ${selected ? "border-primary bg-soft" : "border-line bg-surface"}`}
                  >
                    <span className="block font-medium">{subject.name}</span>
                    <span className="mt-1 block text-xs text-muted">{selected ? "Selected" : atLimit ? "Four subjects selected" : "Add subject"}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: 2 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 2 && (
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-brass">Step 3</p>
            <h1 className="mt-2 font-display text-4xl">When is your exam?</h1>
            <div className="mt-8 space-y-4">
              <label className="block text-sm font-medium" htmlFor="month">Exam month</label>
              <input
                id="month"
                type="month"
                min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
                value={draft.examMonth ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, examMonth: event.target.value || null }))}
                className="w-full border border-line bg-surface px-3 py-3"
              />
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, examMonth: null }))}
                className="min-h-11 self-start text-sm font-semibold text-primary"
              >
                I’m not sure yet — skip
              </button>
            </div>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: 3 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-brass">Step 4</p>
            <h1 className="mt-2 font-display text-4xl">You’re ready.</h1>
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm text-brass">Student</p>
              <p className="mt-2 font-display text-3xl">{sessionUser?.name || "Student"}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-muted">Exams:</span> {draft.exams.map((exam) => exam.toUpperCase()).join(" + ")}</p>
                <p><span className="text-muted">Subjects:</span> {normalizedJambSubjects.map((id) => JAMB_SELECTABLE_SUBJECT_LABELS[id as keyof typeof JAMB_SELECTABLE_SUBJECT_LABELS] ?? subjectMap.get(id)?.name ?? id).join(", ")}</p>
                <p><span className="text-muted">Exam month:</span> {draft.examMonth ? new Date(`${draft.examMonth}-01T00:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" }) : "Not set"}</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted">Your two free days start now.</p>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" disabled={submitting} onClick={submit} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-60">
                {submitting ? "Saving…" : "Open my dashboard"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
