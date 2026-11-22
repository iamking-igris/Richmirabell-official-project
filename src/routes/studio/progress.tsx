import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { attemptsByKind } from "@/lib/assessment";
import { publishedSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";
import { subjectMeta } from "@/lib/mappers";
import { cn } from "@/lib/cn";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/studio/progress")({ component: ProgressPage });

function labelForSubject(key: string) {
  return subjectMeta(key).name;
}

export function ProgressPage() {
  const attempts = useSession((s) => s.attempts);
  const progress = useSession((s) => s.progress);
  const selected = useSession((s) => s.selectedSubjects);
  const best = bestByTopic(attempts);
  const all = publishedSubjects(useContent((s) => s.subjects));
  const mine = (selected.length ? selected : [])
    .map((id) => all.find((subject) => subject.id === id))
    .filter((subject): subject is NonNullable<typeof subject> => Boolean(subject));
  const { topic: topicAttempts, jamb, waec } = attemptsByKind(attempts);

  const cbtSubjectStats = useMemo(() => {
    const map: Record<string, { label: string; correct: number; total: number }> = {};
    for (const attempt of jamb) {
      const scores = (attempt.subjectScores ?? {}) as Record<string, { score?: number; total?: number }>;
      for (const [key, value] of Object.entries(scores)) {
        const normalized = key.toLowerCase();
        if (!map[normalized]) {
          map[normalized] = { label: labelForSubject(normalized), correct: 0, total: 0 };
        }
        map[normalized].correct += Number(value?.score ?? 0);
        map[normalized].total += Number(value?.total ?? 0);
      }
    }
    return Object.entries(map).map(([key, value]) => ({
      key,
      label: value.label,
      correct: value.correct,
      total: value.total,
      pct: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    }));
  }, [jamb]);

  const syllabusCards = mine.map((subject) => {
    const rows = subject.topics.map((topic) => best.get(topic.id)).filter(Boolean);
    const attempted = subject.topics.filter((topic) => best.has(topic.id)).length;
    const average = rows.length
      ? Math.round(
          rows.reduce((sum, attempt) => sum + (attempt!.score / Math.max(attempt!.total, 1)) * 100, 0) /
            rows.length,
        )
      : null;
    return { subject, attempted, average };
  });

  const latestCbt = jamb[0];
  const bestCbt = jamb.reduce<number | null>((bestValue, attempt) => {
    const pct = Math.round((attempt.score / Math.max(attempt.total, 1)) * 100);
    return bestValue === null || pct > bestValue ? pct : bestValue;
  }, null);

  return (
    <div className="space-y-10 pb-16 font-sans">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#2A2422] sm:text-4xl">Student Performance Centre</h1>
        <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-stone-600">
          {attempts.length === 0
            ? "No attempts recorded yet. Begin with a published topic quiz or sit a JAMB CBT."
            : `${plural(jamb.length, "JAMB CBT attempt")} · ${plural(topicAttempts.length, "topic quiz")} · ${plural(waec.length, "WAEC practice run")}`}
          {progress ? ` · ${plural(progress.lessons_completed, "lesson")} completed` : ""}
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#1A4D2E]">JAMB CBT performance</h2>
          <Link
            to="/studio/cbt"
            className="flex items-center gap-1 text-xs font-bold text-[#1A4D2E] hover:underline"
          >
            Open CBT hub <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="space-y-5 rounded-3xl border border-[#E5E0D8] bg-[#FDFBF7] p-6 shadow-xs sm:p-7">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#1A4D2E]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1A4D2E]">
                Backend-scored CBT
              </span>
              <span className="text-xs font-medium text-stone-500">
                {plural(jamb.length, "attempt")}
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#2A2422]">Your CBT history</h3>
            <p className="max-w-2xl text-xs leading-relaxed text-stone-600">
              Scores are calculated by the Richmirabel server from the verified question bank. Raw scores are shown
              exactly as returned; no UTME conversion is invented.
            </p>
          </div>

          {latestCbt ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="block text-[10px] font-bold uppercase text-stone-500">Latest raw score</span>
                <p className="mt-1 font-serif text-2xl font-bold text-[#1A4D2E]">
                  {latestCbt.score} / {latestCbt.total}
                </p>
                <p className="text-[11px] font-medium text-stone-600">
                  {Math.round((latestCbt.score / Math.max(latestCbt.total, 1)) * 100)}% correct
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="block text-[10px] font-bold uppercase text-stone-500">Best accuracy</span>
                <p className="mt-1 font-serif text-2xl font-bold text-emerald-800">{bestCbt ?? 0}%</p>
                <p className="text-[11px] font-medium text-stone-600">Across recorded CBTs</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
                <span className="block text-[10px] font-bold uppercase text-stone-500">Papers completed</span>
                <p className="mt-1 font-serif text-2xl font-bold text-stone-900">{jamb.length}</p>
                <p className="text-[11px] text-stone-500">Server-scored attempts</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 p-5 text-center text-xs text-stone-500">
              No CBT attempts yet. Open the CBT hub when your three elective subjects are set.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/studio/cbt"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#153e25]"
            >
              Go to CBT hub →
            </Link>
          </div>
        </div>
      </section>

      {cbtSubjectStats.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#2A2422]">CBT subject accuracy</h2>
            <p className="mt-1 text-xs text-stone-600">
              Aggregated from the per-subject scores the backend stores for each CBT attempt.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cbtSubjectStats.map((subject) => (
              <div key={subject.key} className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-bold text-stone-900">{subject.label}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      subject.pct >= 70
                        ? "bg-emerald-100 text-emerald-800"
                        : subject.pct >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800",
                    )}
                  >
                    {subject.pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      subject.pct >= 70
                        ? "bg-emerald-600"
                        : subject.pct >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${Math.max(5, subject.pct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  {subject.correct} of {subject.total} questions correct
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2A2422]">Your syllabus subjects</h2>
        {syllabusCards.length === 0 ? (
          <p className="text-xs text-stone-500">
            Choose your four subjects in{" "}
            <Link to="/studio/profile" className="font-semibold text-[#1A4D2E] underline">
              your profile
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {syllabusCards.map(({ subject, attempted, average }) => (
              <li key={subject.id} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4">
                <p className="font-serif text-base font-bold text-stone-900">{subject.name}</p>
                <p className="text-xs text-stone-500">
                  {attempted === 0
                    ? "Not started"
                    : `${attempted} of ${subject.topics.length} topics · best average ${average}%`}
                </p>
                <Link
                  to="/studio/subject/$id"
                  params={{ id: subject.id }}
                  className="mt-2 inline-flex text-xs font-bold text-[#1A4D2E] hover:underline"
                >
                  Open subject notes →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#2A2422]">CBT and exam attempts</h2>
          <span className="text-xs text-stone-500">{jamb.length + waec.length} attempts</span>
        </div>

        {jamb.length + waec.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-xs text-stone-500">
            No CBT or exam attempts submitted yet.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {[...jamb, ...waec]
              .sort((a, b) => b.at - a.at)
              .map((attempt) => {
                const isJamb = attempt.kind === "jamb";
                return (
                  <li key={attempt.id} className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-900">{attempt.title}</span>
                      <span className="font-sans text-xs text-stone-500">
                        {isJamb ? "JAMB CBT" : "WAEC practice"} ·{" "}
                        {new Date(attempt.at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-serif text-sm font-bold text-[#1A4D2E]">
                        {attempt.score} / {attempt.total}
                      </span>
                      {isJamb ? (
                        <Link to="/studio/cbt" className="text-xs font-bold text-[#1A4D2E]">
                          Open →
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-stone-400">Archived</span>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-[#2A2422]">Topic quiz attempts</h2>
          <span className="text-xs text-stone-500">{topicAttempts.length} quizzes</span>
        </div>

        {topicAttempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-6 text-center text-xs text-stone-500">
            No topic quizzes yet. Open any published lesson and take its quiz.
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {topicAttempts.map((attempt) => (
              <li key={attempt.id}>
                <Link
                  to="/studio/review/$attemptId"
                  params={{ attemptId: attempt.id }}
                  className="flex min-h-14 items-center justify-between px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  <div>
                    <span className="block text-sm font-medium text-stone-900">{attempt.title}</span>
                    <span className="font-sans text-xs text-stone-500">
                      Topic quiz ·{" "}
                      {new Date(attempt.at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-stone-900">
                      {attempt.score} / {attempt.total}
                    </span>
                    <span className="text-xs font-bold text-[#1A4D2E]">Review →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
