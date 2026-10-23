import { createFileRoute, Link } from "@tanstack/react-router";
import { BalanceDiagram, CellDiagram, WaveDiagram } from "@/components/diagrams";
import { locateTopic, publishedSubjects, useContent } from "@/lib/content";
import { plural } from "@/lib/format";
import { bestByTopic, useSession } from "@/lib/session";

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

  return (
    <article className="mx-auto max-w-2xl pb-28 md:pb-0">
      <Link to="/studio/subject/$id" params={{ id: subject.id }} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        Back to {subject.name}
      </Link>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">
        {topic.title}
        {topic.origin === "demo" ? <span className="ml-3 align-middle rounded-full bg-soft px-2 py-0.5 text-sm font-semibold text-muted">DEMO</span> : null}
      </h1>
      {topic.origin === "demo" && (
        <p className="mt-2 rounded-xl border border-dashed border-line bg-soft/50 px-3 py-2 text-sm text-muted">
          Synthetic demo content for testing. Not teacher-approved Richmirabel notes.
        </p>
      )}
      <p className="mt-2 text-muted">{topic.summary}</p>
      {topic.mainTopic && <p className="mt-1 text-sm text-muted">{subject.name} · {topic.mainTopic}</p>}
      <p className="mt-2 text-sm text-muted">
        {topic.minutes} min read · {plural(topic.questions.length, "objective question")}{topic.theory && topic.theory.length > 0 ? ` · ${topic.theory.length} theory` : ""}
        {best ? ` · Best ${best.score}/${best.total}` : ""}
      </p>
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl">Learning objectives</h2>
        {topic.objectives && topic.objectives.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {topic.objectives.map((objective) => (
              <li key={objective} className="flex gap-3">
                <span className="mt-2 size-2 shrink-0 bg-primary" aria-hidden />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Learning objectives for this topic are being prepared from the source notes.</p>
        )}
      </section>
      <div className="mt-8 space-y-9 text-[1.0625rem] leading-[1.7]">
        {topic.diagram === "wave" && <WaveDiagram />}
        {topic.diagram === "cell" && <CellDiagram />}
        {topic.diagram === "balance" && <BalanceDiagram />}
        {topic.notes.map((block) => (
          <section key={block.heading}>
            <h2 className="font-display text-2xl">{block.heading}</h2>
            {block.paragraphs.map((p) => (
              <p key={p} className="mt-3">{p}</p>
            ))}
            {block.formula && (
              <p className="mt-4 overflow-x-auto rounded-2xl bg-ink px-4 py-4 text-center font-display text-2xl text-primary-fg">{block.formula}</p>
            )}
            {block.points && (
              <ul className="mt-4 space-y-2 text-base leading-snug">
                {block.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 bg-primary" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {remember.length > 0 && (
          <aside className="rounded-2xl border border-line bg-surface p-5 text-base leading-snug">
            <h2 className="font-display text-xl">Remember</h2>
            <ul className="mt-3 space-y-2">
              {remember.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      {last && (
        <p className="mt-8 text-sm text-muted">
          Last score {last.score}/{last.total}.{best ? ` Best ${best.score}/${best.total}.` : ""}
        </p>
      )}
      <div className="fixed inset-x-0 z-10 flex justify-center px-4 md:static md:mt-8 md:justify-start" style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}>
        {topic.questions.length > 0 ? (
          <Link
            to="/studio/practice/$id"
            params={{ id: topic.id }}
            className="inline-flex h-11 min-w-36 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg shadow-sm"
          >
            Take Quiz
          </Link>
        ) : (
          <p className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted">No quiz for this topic yet.</p>
        )}
      </div>
    </article>
  );
}
