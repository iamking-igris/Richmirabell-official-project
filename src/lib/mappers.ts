import type {
  Choice,
  NoteBlock,
  Question,
  Subject,
  TheoryQuestion,
  Topic,
} from "@/data/catalog";
import type {
  BackendSubjectSummary,
  BackendTopic,
  Progress,
} from "@/lib/backend";
import type { Attempt } from "@/lib/session";

const CHOICES: Choice[] = ["A", "B", "C", "D"];

const SUBJECT_META: Record<string, { name: string; exam: string; blurb: string }> = {
  mathematics: {
    name: "Mathematics",
    exam: "JAMB · WAEC",
    blurb: "Algebra, geometry, and the calculation questions that decide your score.",
  },
  english: {
    name: "Use of English",
    exam: "JAMB · WAEC",
    blurb: "Comprehension, lexis, structure, and the compulsory JAMB paper.",
  },
  physics: {
    name: "Physics",
    exam: "JAMB · WAEC",
    blurb: "Mechanics, waves, electricity, and the calculations that carry marks.",
  },
  chemistry: {
    name: "Chemistry",
    exam: "JAMB · WAEC",
    blurb: "Atomic structure, reactions, organic chemistry, and practical reasoning.",
  },
  biology: {
    name: "Biology",
    exam: "JAMB · WAEC",
    blurb: "Cells, systems, ecology, and the diagrams examiners expect.",
  },
};

export function subjectMeta(id: string) {
  return (
    SUBJECT_META[id] ?? {
      name: id.replace(/(^|-)([a-z])/g, (_, __, c: string) => ` ${c.toUpperCase()}`).trim(),
      exam: "JAMB · WAEC",
      blurb: "Published lessons and practice questions from the Richmirabel content team.",
    }
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export function normalizeOptions(value: unknown): { key: Choice; text: string }[] {
  if (Array.isArray(value)) {
    return value
      .map((option, index) => {
        if (typeof option === "string") {
          return { key: CHOICES[index] ?? "A", text: option };
        }
        const record = asRecord(option);
        const key = String(record.key ?? record.label ?? record.id ?? CHOICES[index] ?? "A")
          .trim()
          .toUpperCase()
          .slice(0, 1) as Choice;
        const text =
          textOf(record.text) ||
          textOf(record.value) ||
          textOf(record.content) ||
          textOf(record.label) ||
          textOf(record.option);
        return { key: CHOICES.includes(key) ? key : (CHOICES[index] ?? "A"), text };
      })
      .filter((option) => option.text.length > 0);
  }
  if (value && typeof value === "object") {
    return Object.entries(asRecord(value)).map(([key, text], index) => {
      const normalized = key.trim().toUpperCase().slice(0, 1) as Choice;
      return {
        key: CHOICES.includes(normalized) ? normalized : (CHOICES[index] ?? "A"),
        text: textOf(text),
      };
    });
  }
  return [];
}

function normalizeAnswer(value: unknown): Choice | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return CHOICES[value] ?? undefined;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return undefined;
    if (normalized.length === 1 && CHOICES.includes(normalized as Choice)) {
      return normalized as Choice;
    }
    if (normalized === "0") return "A";
    if (normalized === "1") return "B";
    if (normalized === "2") return "C";
    if (normalized === "3") return "D";
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  const record = asRecord(value);
  const nested = record.key ?? record.value ?? record.answer;
  if (nested == null || nested === value) return undefined;
  return normalizeAnswer(nested);
}

export function mapQuestion(value: unknown, index = 0): Question {
  const q = asRecord(value);
  const id = textOf(q.id) || textOf(q._id) || `question-${index + 1}`;
  return {
    id,
    prompt: textOf(q.prompt) || textOf(q.question) || textOf(q.text) || "",
    options: normalizeOptions(q.options ?? q.choices),
    answer: normalizeAnswer(q.answer ?? q.correct ?? q.correctOption ?? q.answerKey),
    explain:
      textOf(q.explain) ||
      textOf(q.explanation) ||
      textOf(q.solution) ||
      textOf(q.markingGuide) ||
      textOf(q.marking_guide),
    answerKeyStatus: q.answer ? "shipped" : "missing",
    needsReview: Boolean(q.needsReview ?? q.needs_review),
    reviewReason: textOf(q.reviewReason ?? q.review_reason),
    sourceOrigin: q.sourceOrigin as Question["sourceOrigin"],
    reviewStatus: q.reviewStatus as Question["reviewStatus"],
  };
}

function mapTheoryPart(value: unknown, index: number) {
  const part = asRecord(value);
  return {
    label: textOf(part.label) || `${index + 1}`,
    questionText: textOf(part.questionText) || textOf(part.question) || textOf(part.prompt),
    directAnswer: textOf(part.directAnswer) || textOf(part.answer),
    tutorExplanation:
      textOf(part.tutorExplanation) || textOf(part.explanation) || textOf(part.explain),
    marks: textOf(part.marks),
  };
}

export function mapTheory(value: unknown, index = 0): TheoryQuestion {
  const t = asRecord(value);
  const rawParts = Array.isArray(t.parts) ? t.parts : [];
  const rawSubparts = Array.isArray(t.subparts) ? t.subparts : [];
  return {
    id: textOf(t.id) || `theory-${index + 1}`,
    prompt: textOf(t.prompt) || textOf(t.question) || textOf(t.text) || "",
    introText: textOf(t.introText) || textOf(t.intro),
    modelAnswer: textOf(t.modelAnswer) || textOf(t.answer),
    marks: typeof t.marks === "number" ? t.marks : Number(t.marks) || undefined,
    explain: textOf(t.explain) || textOf(t.explanation),
    diagramSvg: textOf(t.diagramSvg),
    diagramCaption: textOf(t.diagramCaption),
    parts: rawParts.length ? rawParts.map(mapTheoryPart) : undefined,
    subparts: rawSubparts.length
      ? rawSubparts.map((part, partIndex) => {
          const record = asRecord(part);
          return {
            label: textOf(record.label) || `${partIndex + 1}`,
            prompt: textOf(record.prompt) || textOf(record.question),
            modelAnswer: textOf(record.modelAnswer) || textOf(record.answer),
            marks: typeof record.marks === "number" ? record.marks : Number(record.marks) || undefined,
          };
        })
      : undefined,
    needsReview: Boolean(t.needsReview ?? t.needs_review),
    reviewReason: textOf(t.reviewReason ?? t.review_reason),
    sourceOrigin: t.sourceOrigin as TheoryQuestion["sourceOrigin"],
    reviewStatus: t.reviewStatus as TheoryQuestion["reviewStatus"],
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function noteDocumentToNotes(body: unknown): NoteBlock[] {
  if (typeof body === "string" && body.trim()) {
    return [{ heading: "Lesson", paragraphs: [body.trim()] }];
  }

  const record = asRecord(body);
  const rawBlocks = Array.isArray(body)
    ? body
    : Array.isArray(record.blocks)
      ? record.blocks
      : [];

  const notes: NoteBlock[] = [];
  let current: NoteBlock | null = null;

  const ensure = () => {
    if (!current) {
      current = { heading: "Lesson", paragraphs: [] };
      notes.push(current);
    }
    return current;
  };

  for (const raw of rawBlocks) {
    const block = asRecord(raw);
    const type = (textOf(block.type) || "paragraph").toLowerCase();
    const text = textOf(block.text) || textOf(block.content) || textOf(block.value);
    const items = Array.isArray(block.items)
      ? block.items.map((item) => textOf(item)).filter(Boolean)
      : [];

    if (type === "heading" || type === "title" || type === "h1" || type === "h2" || type === "h3") {
      current = { heading: text || "Lesson", paragraphs: [] };
      notes.push(current);
      continue;
    }

    if (type === "formula" || type === "equation" || type === "latex" || type === "math") {
      ensure().formula = textOf(block.latex) || text;
      continue;
    }

    if (
      type === "image" ||
      type === "diagram" ||
      type === "figure" ||
      type === "media" ||
      type === "video"
    ) {
      const url = textOf(block.imageUrl) || textOf(block.url) || textOf(block.src);
      const caption = textOf(block.caption) || textOf(block.alt);
      const target = ensure();
      if (url) {
        target.diagramSvg = `<img src="${escapeHtml(url)}" alt="${escapeHtml(caption || "Lesson diagram")}" loading="lazy" />`;
      }
      if (caption) target.diagramCaption = caption;
      continue;
    }

    // Objectives are surfaced via the topic's canonical objectives/learning_objectives
    // field and rendered in a dedicated "Learning Objectives" section. Skip objective
    // blocks here to avoid duplicating them as lesson content.
    if (type === "objectives" || type === "objective" || type === "learning_objectives") {
      continue;
    }

    if (
      type === "bullet" ||
      type === "bullets" ||
      type === "list" ||
      type === "points" ||
      type === "checklist"
    ) {
      const target = ensure();
      target.points = [...(target.points ?? []), ...(items.length ? items : text.split("\n").filter(Boolean))];
      continue;
    }

    if (type === "table") {
      const rows = Array.isArray(block.rows) ? block.rows : [];
      const rendered = rows
        .map((row) => (Array.isArray(row) ? row.map((cell) => textOf(cell)).join(" | ") : textOf(row)))
        .filter(Boolean)
        .join("\n");
      if (rendered) ensure().paragraphs.push(rendered);
      continue;
    }

    if (text) {
      ensure().paragraphs.push(text);
    } else if (items.length) {
      ensure().points = [...(ensure().points ?? []), ...items];
    }
  }

  const cleaned = notes
    .map((note) => ({
      ...note,
      paragraphs: note.paragraphs.filter(Boolean),
      points: note.points?.filter(Boolean),
    }))
    .filter(
      (note) =>
        note.heading !== "Lesson" ||
        note.paragraphs.length > 0 ||
        Boolean(note.formula) ||
        Boolean(note.points?.length) ||
        Boolean(note.diagramSvg),
    );

  if (!cleaned.length) {
    return [{ heading: "Lesson", paragraphs: ["This lesson has no published notes yet."] }];
  }
  return cleaned;
}

export function mapTopic(topic: BackendTopic, subjectId = topic.subject_id): Topic {
  const objectives = (topic.learning_objectives?.length ? topic.learning_objectives : topic.objectives) ?? [];
  return {
    id: topic.id,
    title: topic.title,
    minutes: topic.minutes ?? 12,
    summary: topic.summary ?? "",
    objectives,
    notes: noteDocumentToNotes(topic.body),
    questions: (topic.questions ?? []).map((question, index) => mapQuestion(question, index)),
    theory: (topic.theory ?? []).map((question, index) => mapTheory(question, index)),
    status: topic.status === "PUBLISHED" ? "published" : "draft",
    mainTopic: topic.main_topic ?? undefined,
    origin: "shipped",
    source_keys: topic.source_keys ?? [],
  };
}

export function mapSubject(summary: BackendSubjectSummary, topics: BackendTopic[]): Subject {
  const meta = subjectMeta(summary.id);
  return {
    id: summary.id,
    name: summary.name || meta.name,
    exam: summary.exam || meta.exam,
    blurb: summary.blurb || meta.blurb,
    group: "sciences",
    topics: topics.map((topic) => mapTopic(topic, summary.id)),
    available: true,
  };
}

export function mapProgressToAttempts(progress: Progress | null | undefined): Attempt[] {
  if (!progress) return [];
  const attempts: Attempt[] = [];
  for (const quiz of progress.quizzes ?? []) {
    attempts.push({
      id: quiz.id,
      topicId: quiz.topic_id ?? "",
      title: quiz.title || (quiz.topic_id ? quiz.topic_id.replace(/-/g, " ") : "Assessment"),
      score: quiz.score,
      total: quiz.total,
      at: Date.parse(quiz.at) || Date.now(),
      kind: (quiz.kind === "waec" ? "waec" : "topic") as Attempt["kind"],
      subjectLabel: quiz.subject_label ?? undefined,
      counts: quiz.counts as any,
    });
  }
  for (const exam of progress.exams ?? []) {
    attempts.push({
      id: exam.id,
      topicId: exam.id,
      title: exam.title || `JAMB CBT · ${exam.mode.replace(/_/g, " ")}`,
      score: exam.score,
      total: exam.total,
      at: Date.parse(exam.started_at) || Date.now(),
      kind: "jamb",
      subjectLabel: "JAMB CBT",
      subjectScores: exam.subject_scores,
      counts: exam.counts as any,
    });
  }
  return attempts.sort((a, b) => b.at - a.at);
}

export function slugToTitle(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function topicToPayload(
  topic: Topic,
  subjectId: string,
  sourceKeys: string[] = [],
): import("@/lib/backend").TopicPayload {
  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary ?? "",
    main_topic: topic.mainTopic ?? null,
    minutes: topic.minutes ?? 12,
    objectives: topic.objectives ?? [],
    learning_objectives: topic.objectives ?? [],
    body: topic.body ?? {},
    questions: topic.questions ?? [],
    theory: topic.theory ?? [],
    source_keys: sourceKeys,
    status: topic.status === "published" ? "PUBLISHED" : "DRAFT",
    subject_id: subjectId,
  };
}
