import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { monthOptions } from "@/components/subject-picker";
import { AVAILABLE_SUBJECT_IDS, JAMB_OPTIONAL_IDS, publishedSubjects, useContent } from "@/lib/content";
import { monthLabel } from "@/lib/format";
import { useSession, type Exam } from "@/lib/session";

export const Route = createFileRoute("/studio/profile")({ component: Profile });

function Profile() {
  const navigate = useNavigate();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const exams = useSession((s) => s.exams);
  const jambSubjects = useSession((s) => s.jambSubjects);
  const examMonth = useSession((s) => s.examMonth);
  const update = useSession((s) => s.updateProfile);
  const [pickedExams, setPickedExams] = useState<Exam[]>(exams.length ? exams : ["jamb"]);
  const [picked, setPicked] = useState(jambSubjects);
  const [month, setMonth] = useState(examMonth ?? "");
  const needsJamb = pickedExams.includes("jamb");
  const optional = JAMB_OPTIONAL_IDS.map((id) => subjects.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  function toggleExam(exam: Exam) {
    setPickedExams((current) => (current.includes(exam) ? current.filter((e) => e !== exam) : [...current, exam]));
  }
  function toggleSubject(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : current.length >= 3 ? current : [...current, id]));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/studio" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Back to dashboard</Link>
      <h1 className="mt-2 font-display text-4xl">Your plan</h1>
      <p className="mt-2 text-muted">Changing this does not delete your scores. Physics, Chemistry, Biology, and Mathematics are the open science subjects.</p>
      <h2 className="mt-8 font-display text-2xl">Exams</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["waec", "jamb"] as const).map((exam) => (
          <button key={exam} type="button" onClick={() => toggleExam(exam)} className={`min-h-20 rounded-2xl border p-4 text-left ${pickedExams.includes(exam) ? "border-primary bg-soft" : "border-line bg-surface"}`}>
            <span className="font-display text-xl uppercase">{exam}</span>
          </button>
        ))}
      </div>
      {needsJamb && (
        <>
          <h2 className="mt-8 font-display text-2xl">JAMB subjects</h2>
          <p className="mt-1 text-sm text-muted">Use of English is compulsory. Pick three more.</p>
          <ul className="mt-3 space-y-2">
            {optional.map((subject) => (
              <li key={subject.id}>
                <button type="button" onClick={() => toggleSubject(subject.id)} className={`flex w-full min-h-14 items-center justify-between rounded-2xl border px-4 text-left ${picked.includes(subject.id) ? "border-primary bg-surface" : "border-line bg-surface"}`}>
                  <span>
                    <span className="block font-medium">{subject.name}</span>
                    <span className="text-sm text-muted">{AVAILABLE_SUBJECT_IDS.has(subject.id) ? "Open now" : "In preparation"}</span>
                  </span>
                  <span className="text-sm">{picked.includes(subject.id) ? "Selected" : "Add"}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mt-8 font-display text-2xl">Exam month</h2>
      <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Exam month" className="mt-3 min-h-12 w-full rounded-xl border border-line bg-surface px-3">
        <option value="">Not set</option>
        {[...(month && !monthOptions().some((m) => m.value === month) ? [{ value: month, label: monthLabel(month) || month }] : []), ...monthOptions()].map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={pickedExams.length === 0 || (needsJamb && picked.length !== 3)}
        onClick={() => {
          update({ exams: pickedExams, jambSubjects: needsJamb ? picked : [], examMonth: month || null });
          navigate({ to: "/studio" });
        }}
        className="mt-8 min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg disabled:opacity-40"
      >
        Save changes
      </button>
    </div>
  );
}
