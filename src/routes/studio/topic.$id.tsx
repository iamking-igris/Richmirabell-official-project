import { createFileRoute, Link } from "@tanstack/react-router";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { BalanceDiagram, CellDiagram, WaveDiagram } from "@/components/diagrams";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";
import { InlineMathText, ParagraphContentRenderer } from "@/components/NotePreviewRenderer";

/**
 * Clean helper function to sanitize and format LaTeX strings before KaTeX rendering.
 */
function cleanLatex(mathStr: string): string {
  if (!mathStr) return '';
  let cleaned = mathStr.trim();
  cleaned = cleaned.replace(/^```(?:latex|tex)?\s*/i, '').replace(/\s*```$/, '');
  if ((cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) || (cleaned.startsWith('\\[') && cleaned.endsWith('\\]'))) {
    cleaned = cleaned.slice(2, -2).trim();
  } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export const Route = createFileRoute("/studio/topic/$id")({ component: TopicPage });

function TopicPage() {
  const { id } = Route.useParams();
  const subjects = publishedSubjects(useContent((s) => s.subjects));
  const found = locateTopic(subjects, id);
  const attempts = useSession((s) => s.attempts);
  const best = bestByTopic(attempts).get(id);
  const last = attempts.find((a) => a.topicId === id);
  if (!found) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl">Topic not found</h1>
        <p className="mt-2 text-sm text-muted">That topic is not open. Start with Physics.</p>
        <Link to="/studio" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">
          Back to dashboard
        </Link>
      </div>
    );
  }
  const { subject, topic } = found;
  const remember = topic.notes.flatMap((b) => b.points ?? []).slice(0, 5);
  const read = topic.notes.reduce((n, b) => n + (b.paragraphs || []).join(" ").split(/\s+/).length, 0);

  return (
    <article className="mx-auto max-w-[42rem] pb-28 md:pb-8">
      <Link to="/studio/subject/$id" params={{ id: subject.id }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        {subject.name}
      </Link>
      <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">{topic.mainTopic ?? subject.name}</p>
      <h1 className="mt-2 font-display text-4xl leading-[1.05] sm:text-5xl">
        {topic.title}
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted">{topic.summary}</p>
      <p className="mt-3 text-sm text-muted">
        {topic.minutes || Math.max(4, Math.round(read / 180))} min · {plural(topic.questions.length, "question")}
        {topic.theory && topic.theory.length > 0 ? ` · ${topic.theory.length} theory` : ""}
        {best ? ` · Best ${best.score}/${best.total}` : ""}
      </p>

      {topic.diagram === "wave" && <div className="mt-8"><WaveDiagram /></div>}
      {topic.diagram === "cell" && <div className="mt-8"><CellDiagram /></div>}
      {topic.diagram === "balance" && <div className="mt-8"><BalanceDiagram /></div>}

      <div className="mt-10 space-y-10 text-[1.075rem] leading-[1.75]">
        {topic.body ? (
          <div className="lesson-body" dangerouslySetInnerHTML={{ __html: topic.body }} />
        ) : (
          <>
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
                {(block.paragraphs || []).map((p, pIdx) => (
                  <div key={`${p.slice(0, 20)}-${pIdx}`} className="mt-4">
                    <ParagraphContentRenderer text={p} />
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
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E5DFD7] bg-[#F9F6F0] p-6 sm:p-8 text-center text-[#1A4D2E] text-xl sm:text-2xl shadow-xs">
                    <BlockMath
                      math={cleanLatex(block.formula)}
                      errorColor="#cc0000"
                      renderError={() => (
                        <div className="py-2 px-3 rounded-lg bg-red-50 text-red-600 font-sans text-xs inline-block">
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
            {remember.map((r, idx) => (
              <li key={`${r.slice(0, 15)}-${idx}`}>
                <InlineMathText text={r} />
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
      <Link to="/studio/practice/$id" params={{ id: topic.id }} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-fg">
        Practice this subtopic
      </Link>
    </article>
  );
}
