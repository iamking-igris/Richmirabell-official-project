import type { Choice, Question } from "@/data/catalog";
import type { CbtSection } from "@/lib/backend";
import { mapQuestion } from "@/lib/mappers";

export const JAMB_SUBJECT_IDS = ["english", "mathematics", "physics", "chemistry", "biology"] as const;
export type JambSubjectId = (typeof JAMB_SUBJECT_IDS)[number];

export const JAMB_OPTIONAL_SUBJECT_IDS = ["mathematics", "physics", "chemistry", "biology"] as const;
export type JambOptionalSubjectId = (typeof JAMB_OPTIONAL_SUBJECT_IDS)[number];

export const JAMB_SUBJECT_LABELS: Record<string, string> = {
  english: "Use of English",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

export const JAMB_SECTION_TARGETS: Record<string, number> = {
  english: 60,
  mathematics: 40,
  physics: 40,
  chemistry: 40,
  biology: 40,
};

export const JAMB_PAPER_TOTAL = 180;
export const JAMB_DURATION_MINUTES = 120;

export function normalizeSubjectId(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "english language" || normalized === "use of english") return "english";
  if (normalized === "math" || normalized === "maths") return "mathematics";
  return normalized;
}

export function subjectLabel(id: string | null | undefined): string {
  const normalized = normalizeSubjectId(id);
  return JAMB_SUBJECT_LABELS[normalized] ?? (normalized ? normalized.replace(/(^|-)([a-z])/g, (_, __, c: string) => ` ${c.toUpperCase()}`).trim() : "Subject");
}

export function isOptionalJambSubject(value: string): value is JambOptionalSubjectId {
  return (JAMB_OPTIONAL_SUBJECT_IDS as readonly string[]).includes(normalizeSubjectId(value));
}

export function isCbtInProgress(status: string | null | undefined): boolean {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return ["", "in_progress", "in-progress", "started", "active", "open", "pending"].includes(normalized);
}

export function isCbtSubmitted(status: string | null | undefined): boolean {
  return !isCbtInProgress(status);
}

/**
 * Returns only the valid, de-duplicated JAMB optional subjects. The backend
 * requires exactly three distinct optional subjects plus compulsory English.
 */
export function normalizeJambSubjects(values: string[] | null | undefined): string[] {
  const subjects: string[] = [];
  for (const value of values ?? []) {
    const id = normalizeSubjectId(value);
    if (isOptionalJambSubject(id) && !subjects.includes(id)) subjects.push(id);
  }
  return subjects;
}

export function candidateJambSubjects(optionalSubjects: string[]): string[] {
  return ["english", ...optionalSubjects];
}

export function subjectTarget(id: string): number {
  return JAMB_SECTION_TARGETS[normalizeSubjectId(id)] ?? 40;
}

/** Resolves the backend deadline, falling back to started_at + duration. */
export function resolveCbtDeadlineMs(input: {
  deadline?: string | null;
  started_at?: string | null;
  duration_minutes?: number | null;
}): number | null {
  const deadline = Date.parse(input.deadline ?? "");
  if (Number.isFinite(deadline)) return deadline;

  const started = Date.parse(input.started_at ?? "");
  if (!Number.isFinite(started)) return null;
  const minutes = Number(input.duration_minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return started + minutes * 60_000;
}

export function cbtElapsedSeconds(startedAt: string | null | undefined): number {
  const started = Date.parse(startedAt ?? "");
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

export function normalizeChoice(value: unknown): Choice | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C" || normalized === "D"
    ? (normalized as Choice)
    : undefined;
}

export function normalizeAnswerMap(value: Record<string, string> | null | undefined): Record<string, Choice> {
  const answers: Record<string, Choice> = {};
  for (const [questionId, answer] of Object.entries(value ?? {})) {
    const choice = normalizeChoice(answer);
    if (choice) answers[questionId] = choice;
  }
  return answers;
}

export type CbtQuestionView = Question & {
  subjectId: string;
  subjectLabel: string;
};

export type CbtSectionView = {
  subject: string;
  label: string;
  questions: CbtQuestionView[];
};

/**
 * Normalizes the raw questions returned by the CBT endpoints without adding,
 * padding, or inventing questions. Question ids from the backend are preserved
 * so submitted picks can be matched by the grader.
 */
export function buildCbtSections(sections: CbtSection[] | null | undefined): CbtSectionView[] {
  let globalIndex = 0;
  return (sections ?? []).map((section) => {
    const subjectId = normalizeSubjectId(section.subject);
    const label = subjectLabel(subjectId);
    const questions = (section.questions ?? []).map((raw, index) => {
      const question = mapQuestion(raw, globalIndex + index);
      return {
        ...question,
        subjectId,
        subjectLabel: label,
      };
    });
    globalIndex += questions.length;
    return { subject: subjectId, label, questions };
  });
}

export function flattenCbtSections(sections: CbtSectionView[]): CbtQuestionView[] {
  return sections.flatMap((section) => section.questions);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function percentage(score: number, total: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((score / total) * 100);
}
