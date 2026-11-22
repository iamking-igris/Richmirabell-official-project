import { createFileRoute, Link } from "@tanstack/react-router";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { BalanceDiagram, CellDiagram, WaveDiagram } from "@/components/diagrams";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";
import { InlineMathText, ParagraphContentRenderer } from "@/components/NotePreviewRenderer";
import { useState } from "react";
import { ApiError } from "@/services/api/errors";

/**
 * Clean helper function to sanitize and format LaTeX strings before KaTeX rendering.
 */
function cleanLatex(mathStr: string): string {
  if (!mathStr) return "";
  let cleaned = mathStr.trim();
  cleaned = cleaned.replace(/^```(?:latex|tex)?\s*/i, "").replace(/\s*```$/, "");
  if (
    (cleaned.startsWith("\\(") && cleaned.endsWith("\\)")) ||
    (cleaned.startsWith("\\[") && cleaned.endsWith("\\]"))
  ) {
    cleaned = cleaned.slice(2, -2).trim();
  } else if (cleaned.startsWith("$") && cleaned.endsWith("$")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export const Route = createFileRoute("/studio/topic/$id")({ component: TopicPage });

function TopicPage() {
  const { id } = Route.useParams();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const loading = useContent((s) => s.loading);
  const error = useContent((s) => s.error);
  const found = locateTopic(subjects, id);
  const attempts = useSession((s) => s.attempts);
  const lessons = useSession((s) => s.progress?.lessons);
  const completeLesson = useSession((s) => s.completeLesson);
  const best = bestByTopic(attempts).get(id);
  const last = attempts.find((a) => a.topicId === id);
  const [busy, setBusy] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const completed = Boolean(lessons?.some((lesson) => lesson.topic_id === id));

  if (!found) {
    if (loading) {
      return (
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl">Loading lesson…</h1>
          <p className="mt-2 text-sm text-muted">Fetching the published lesson from the backend.</p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">{error ? "Could not load this lesson" : "Topic not found"}</h1>
        <p className="mt-2 text-sm text-muted">
          {error || "It may not be published yet, or the link is out of date."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/studio/subjects"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Back to subjects
          </Link>
          {error && (
            <button
              type="button"
              onClick={() => void useContent.getState().refresh().catch(() => undefined)}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const { subject, topic } = found;
  const remember = topic.notes.flatMap((block) => block.points ?? []).slice(0, 5);
  const read = topic.notes.reduce(
    (total, block) => total + (block.paragraphs || []).join(" ").split(/\s+/).filter(Boolean).length,
    0,
  );

  async function markComplete() {
    setBusy(true);
    setCompletionError("");
    try {
      await completeLesson(topic.id);
    } catch (err) {
      setCompletionError(err instanceof ApiError ? err.message : "Could not save your progress.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mx-auto max-w-[42rem] pb-28 md:pb-8">
      <Link
        to="/studio/subject/$id"
        params={{ id: subject.id }}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >
        {subject.name}
      </Link>
      <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        {topic.mainTopic ?? subject.name}
      </p>
      <h1 className="mt-2 font-display text-4xl leading-[1.05] sm:text-5xl">{topic.title}</h1>
      <p className="mt-3 max-w-xl text-lg text-muted">{topic.summary}</p>
      <p className="mt-3 text-sm text-muted">
        {topic.minutes || Math.max(4, Math.round(read / 180))} min · {plural(topic.questions.length, "question")}
        {topic.theory && topic.theory.length > 0 ? ` · ${topic.theory.length} theory` : ""}
        {best ? ` · Best ${best.score}/${best.total}` : ""}
        {completed ? " · Completed" : ""}
      </p>

      {topic.diagram === "wave" && (
        <div className="mt-8">
          <WaveDiagram />
        </div>
      )}
      {topic.diagram === "cell" && (
        <div className="mt-8">
          <CellDiagram />
        </div>
      )}
      {topic.diagram === "balance" && (
        <div className="mt-8">
          <BalanceDiagram />
        </div>
      )}

      <div className="mt-10 space-y-10 text-[1.075rem] leading-[1.75]">
        {topic.body ? (
          <div className="lesson-body" dangerouslySetInnerHTML={{ __html: topic.body }} />
        ) : (
          <>
            {topic.objectives && topic.objectives.length > 0 && (
              <section>
                <h2 className="font-display text-[1.65rem] leading-tight text-[#2A2422]">
                  Learning Objectives
                </h2>
                <div className="mt-3 h-px w-10 bg-brass" aria-hidden />
                <ul className="mt-5 space-y-2.5 text-base leading-snug">
                  {topic.objectives.map((objective, idx) => (
                    <li key={`${objective.slice(0, 20)}-${idx}`} className="flex gap-3">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span className="text-[#2A2422]">
                        <InlineMathText text={objective} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {topic.notes.map((block, idx) => (
              <section key={block.heading ? `${block.heading}-${idx}` : `block-${idx}`}>
                {block.heading && (
                  <>
                    <h2 className="font-display text-[1.65rem] leading-tight text-[#2A2422]">
                      <InlineMathText text={block.heading} />
                    </h2>
                    <div className="mt-3 h-px w-10 bg-brass" aria-hidden />
                  </>
                )}
                {(block.paragraphs || []).map((paragraph, pIdx) => (
                  <div key={`${paragraph.slice(0, 20)}-${pIdx}`} className="mt-4">
                    <ParagraphContentRenderer text={paragraph} />
                  </div>
                ))}
                {block.diagramSvg && (
                  <figure className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
                    <div className="p-3" dangerouslySetInnerHTML={{ __html: block.diagramSvg }} />
                    {block.diagramCaption && (
                      <figcaption className="border-t border-line px-4 py-3 text-sm text-muted">
                        <InlineMathText text={block.diagramCaption} />
                      </figcaption>
                    )}
                  </figure>
                )}
                {block.formula && (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E5DFD7] bg-[#F9F6F0] p-6 text-center text-xl text-[#1A4D2E] shadow-xs sm:p-8 sm:text-2xl">
                    <BlockMath
                      math={cleanLatex(block.formula)}
                      errorColor="#cc0000"
                      renderError={() => (
                        <div className="inline-block rounded-lg bg-red-50 px-3 py-2 font-sans text-xs text-red-600">
                          Invalid LaTeX: <code className="font-mono">{block.formula}</code>
                        </div>
                      )}
                    />
                  </div>
                )}
                {block.points && (
                  <ul className="mt-5 space-y-2.5 text-base leading-snug">
                    {block.points.map((point, pointIdx) => (
                      <li key={`${point.slice(0, 15)}-${pointIdx}`} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                        <span className="text-[#2A2422]">
                          <InlineMathText text={point} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </>
        )}
      </div>

      {remember.length > 0 && (
        <aside className="mt-12 rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Remember</p>
          <ul className="mt-3 space-y-2 text-base">
            {remember.map((item, idx) => (
              <li key={`${item.slice(0, 15)}-${idx}`}>
                <InlineMathText text={item} />
              </li>
            ))}
          </ul>
        </aside>
      )}

      {last && (
        <p className="mt-8 text-sm text-muted">
          Last score {last.score}/{last.total}.{best ? ` Best ${best.score}/${best.total}.` : ""}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {topic.questions.length > 0 || (topic.theory?.length ?? 0) > 0 ? (
          <Link
            to="/studio/practice/$id"
            params={{ id: topic.id }}
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-fg"
          >
            Practice this subtopic
          </Link>
        ) : (
          <span className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 text-sm font-semibold text-muted">
            No practice questions published yet
          </span>
        )}
        <button
          type="button"
          disabled={busy || completed}
          onClick={markComplete}
          className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 text-sm font-semibold disabled:opacity-60"
        >
          {completed ? "Lesson completed" : busy ? "Saving…" : "Mark lesson complete"}
        </button>
      </div>
      {completionError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {completionError}
        </p>
      )}
    </article>
  );
}
