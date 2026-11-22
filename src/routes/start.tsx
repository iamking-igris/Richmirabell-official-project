import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand";
import { COMPULSORY, tracks } from "@/data/tracks";
import { publishedSubjects, useContent } from "@/lib/content";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/start")({ component: StartFlow });

type Track = keyof typeof tracks;

type Draft = {
  name: string;
  track: Track | null;
  subjects: string[];
  examMonth: string | null;
  step: number;
};

const STORAGE_KEY = "richmirabel-start-draft";
const stepTitles = ["Name", "Class", "JAMB subjects", "Exam date", "Ready"];

function getDefaultSubjects(track: Track | null) {
  if (!track) return [COMPULSORY];
  return [COMPULSORY, ...tracks[track].usual];
}

function StartFlow() {
  const navigate = useNavigate();
  const sessionName = useSession((s) => s.name);
  const sessionTrack = useSession((s) => s.track);
  const existingSubjects = useSession((s) => s.subjects);
  const completeOnboarding = useSession((s) => s.completeOnboarding);

  const [draft, setDraft] = useState<Draft>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const parsed = saved ? (JSON.parse(saved) as Partial<Draft>) : {};
    const track = (parsed.track as Track | null) ?? (sessionTrack as Track | null) ?? null;
    const fallbackSubjects = track ? [...new Set((existingSubjects.length ? existingSubjects : getDefaultSubjects(track)))] : [COMPULSORY];
    return {
      name: sessionName || parsed.name || "",
      track,
      subjects: Array.isArray(parsed.subjects) && parsed.subjects.length ? parsed.subjects : fallbackSubjects,
      examMonth: parsed.examMonth ?? null,
      step: sessionName && !sessionTrack ? 1 : typeof parsed.step === "number" ? parsed.step : 0,
    };
  });

  const [showOtherSubjects, setShowOtherSubjects] = useState(false);
  const subjects = publishedSubjects(useContent((s) => s.subjects));

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  const classSubjects = useMemo(() => {
    if (!draft.track) return [] as string[];
    return tracks[draft.track].offered;
  }, [draft.track]);

  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const selectedExtras = useMemo(() => draft.subjects.filter((id) => id !== COMPULSORY), [draft.subjects]);
  const validName = draft.name.trim();
  const nameError = draft.step === 0 && validName.length > 0 && (validName.length < 2 || validName.length > 20);

  const subjectOptions = useMemo(() => {
    const ids = new Set(classSubjects);
    return subjects.filter(
      (subject) =>
        subject.topics.some((topic) => topic.status !== "draft") &&
        (subject.id === COMPULSORY || ids.has(subject.id)),
    );
  }, [classSubjects, subjects]);

  const otherSubjectOptions = useMemo(() => {
    const track = draft.track;
    if (!track) return [];
    return subjectOptions.filter(
      (subject) => !draft.subjects.includes(subject.id) && !tracks[track].offered.includes(subject.id) && subject.id !== COMPULSORY,
    );
  }, [draft.subjects, draft.track, subjectOptions]);

  const handleBack = () => setDraft((current) => ({ ...current, step: Math.max(0, current.step - 1) }));

  const selectTrack = (track: Track) => {
    setDraft((current) => ({
      ...current,
      track,
      subjects: [COMPULSORY, ...new Set(tracks[track].usual)],
    }));
  };

  const toggleSubject = (subjectId: string) => {
    if (!draft.track) return;
    if (subjectId === COMPULSORY) return;

    const extras = selectedExtras.includes(subjectId)
      ? selectedExtras.filter((id) => id !== subjectId)
      : selectedExtras.length >= 3
        ? selectedExtras
        : [...selectedExtras, subjectId];

    const next = [COMPULSORY, ...extras].filter((id, index, list) => list.indexOf(id) === index);
    const inTrack = classSubjects.includes(subjectId) || tracks[draft.track].offered.includes(subjectId);
    if (!inTrack) {
      const merged = [...new Set([COMPULSORY, ...selectedExtras, subjectId])];
      setDraft((current) => ({ ...current, subjects: merged.slice(0, 4) }));
      return;
    }
    setDraft((current) => ({ ...current, subjects: next }));
  };

  const useUsualCombination = () => {
    if (!draft.track) return;
    setDraft((current) => ({ ...current, subjects: [COMPULSORY, ...tracks[current.track!].usual] }));
  };

  const canContinue =
    draft.step === 0 ? validName.length >= 2 && validName.length <= 20 :
    draft.step === 1 ? Boolean(draft.track) :
    draft.step === 2 ? draft.subjects.length >= 4 :
    draft.step === 3 ? true :
    true;

  const submit = async () => {
    if (!draft.track) return;
    const nextSubjects = [COMPULSORY, ...new Set(draft.subjects.filter((id) => id !== COMPULSORY))].slice(0, 4);
    await completeOnboarding({
      name: draft.name.trim(),
      exams: ["jamb"],
      jambSubjects: nextSubjects.filter((id) => id !== COMPULSORY),
      examMonth: draft.examMonth,
      track: draft.track,
      subjects: nextSubjects,
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    navigate({ to: "/studio" });
  };

  const readySubjects = draft.subjects.length ? draft.subjects : getDefaultSubjects(draft.track);

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
            <h1 className="mt-2 font-display text-4xl">What should we call you?</h1>
            <label className="mt-6 block text-sm font-medium" htmlFor="name">First name</label>
            <input id="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full border border-line bg-surface px-3 py-3" placeholder="Aisha" />
            {nameError && <p className="mt-2 text-sm text-ink">Use 2 to 20 characters.</p>}
            <div className="mt-8 flex gap-3">
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: 1 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 1 && (
          <div>
            <p className="text-sm text-brass">Step 2</p>
            <h1 className="mt-2 font-display text-4xl">Which class are you in?</h1>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {Object.entries(tracks).map(([id, config]) => (
                <button key={id} type="button" onClick={() => selectTrack(id as Track)} className={`min-h-[120px] border p-5 text-left ${draft.track === id ? "border-primary bg-soft" : "border-line bg-surface"}`}>
                  <p className="font-display text-2xl">{config.label}</p>
                  <p className="mt-2 text-sm text-muted">{config.blurb}</p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: 2 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 2 && draft.track && (
          <div>
            <p className="text-sm text-brass">Step 3</p>
            <h1 className="mt-2 font-display text-4xl">Choose your JAMB subjects</h1>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
              <div>
                <p className="font-medium">Use of English</p>
                <p className="text-sm text-muted">Compulsory</p>
              </div>
              <span className="rounded-full bg-soft px-2 py-1 text-xs font-medium text-primary">Locked</span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="font-medium">{selectedExtras.length} of 3 chosen</p>
              <button type="button" onClick={useUsualCombination} className="text-sm font-semibold text-primary">Use the usual combination</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {draft.subjects.map((subjectId) => {
                const subject = subjectMap.get(subjectId);
                if (!subject) return null;
                return (
                  <button key={subject.id} type="button" disabled={subject.id === COMPULSORY} onClick={() => toggleSubject(subject.id)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${subject.id === COMPULSORY ? "border-primary bg-soft text-primary" : draft.subjects.includes(subject.id) ? "border-primary bg-soft" : "border-line bg-paper text-muted"}`}>
                    <span>{subject.name}</span>
                    {subject.id === COMPULSORY && <span className="text-[10px] uppercase tracking-wide">Compulsory</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border border-line bg-surface p-4">
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowOtherSubjects((v) => !v)}>
                <span className="font-medium">Other subjects</span>
                <span className="text-sm text-muted">{showOtherSubjects ? "Hide" : "Show"}</span>
              </button>
              {showOtherSubjects && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {otherSubjectOptions.map((subject) => (
                    <button key={subject.id} type="button" onClick={() => toggleSubject(subject.id)} className={`flex items-center justify-between rounded-xl border p-3 text-left ${draft.subjects.includes(subject.id) ? "border-primary bg-soft" : "border-line bg-paper opacity-80"}`}>
                      <span>
                        <span className="block font-medium">{subject.name}</span>
                        <span className="text-xs text-muted">{subject.topics.length} topics</span>
                      </span>
                      {draft.subjects.includes(subject.id) ? <span className="text-xs text-primary">Added</span> : <span className="text-xs text-muted">Add</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" disabled={!canContinue} onClick={() => setDraft((current) => ({ ...current, step: 3 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-brass">Step 4</p>
            <h1 className="mt-2 font-display text-4xl">When is your exam?</h1>
            <div className="mt-8 space-y-4">
              <label className="block text-sm font-medium" htmlFor="month">Exam month</label>
              <input id="month" type="month" value={draft.examMonth ?? ""} onChange={(event) => setDraft((current) => ({ ...current, examMonth: event.target.value || null }))} className="w-full border border-line bg-surface px-3 py-3" />
              <button type="button" onClick={() => setDraft((current) => ({ ...current, examMonth: null }))} className="text-sm font-semibold text-primary">I’m not sure yet</button>
            </div>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" onClick={() => setDraft((current) => ({ ...current, step: 4 }))} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg">Continue</button>
            </div>
          </div>
        )}

        {draft.step === 4 && draft.track && (
          <div className="mx-auto max-w-xl">
            <p className="text-sm text-brass">Step 5</p>
            <h1 className="mt-2 font-display text-4xl">You’re ready.</h1>
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm text-brass">Student</p>
              <p className="mt-2 font-display text-3xl">{draft.name.trim()}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-muted">Class:</span> {tracks[draft.track].label}</p>
                <p><span className="text-muted">Subjects:</span> {readySubjects.map((id) => subjectMap.get(id)?.name ?? id).join(", ")}</p>
                <p><span className="text-muted">Exam:</span> {draft.examMonth ? new Date(`${draft.examMonth}-01T00:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" }) : "Not set yet"}</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted">Your two free days start now.</p>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={handleBack} className="min-h-11 border border-line px-6 text-sm">Back</button>
              <button type="button" onClick={submit} className="min-h-11 bg-primary px-6 text-sm font-semibold text-primary-fg">Open my dashboard</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
