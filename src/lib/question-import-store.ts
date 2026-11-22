import type { QuestionImportBatch, SourcePageItem, MatchedRecord, QuestionOption, ChoiceKey } from "@/types/question-import";
import type { Question } from "@/data/catalog";

let batches: QuestionImportBatch[] = [];

function now() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export type NewBatchMeta = {
  title: string;
  subject: string;
  examType: QuestionImportBatch["examType"];
  year: string;
  paperIdentifier: string;
  description?: string;
};

export function loadQuestionBatches(): QuestionImportBatch[] {
  return [...batches];
}

export function createNewBatch(meta: NewBatchMeta): QuestionImportBatch {
  const batch: QuestionImportBatch = {
    id: generateId(),
    title: meta.title,
    subject: meta.subject,
    examType: meta.examType,
    year: meta.year,
    paperIdentifier: meta.paperIdentifier,
    description: meta.description,
    createdAt: now(),
    updatedAt: now(),
    status: "draft",
    questionSources: [],
    answerSources: [],
    extractedQuestions: [],
    extractedAnswers: [],
    matchedRecords: [],
  };
  batches = [batch, ...batches];
  return batch;
}

export function updateBatch(id: string, patch: Partial<QuestionImportBatch>): QuestionImportBatch | undefined {
  const index = batches.findIndex((b) => b.id === id);
  if (index === -1) return undefined;
  const updated = { ...batches[index], ...patch, updatedAt: now() };
  batches = batches.map((b) => (b.id === id ? updated : b));
  return updated;
}

export function deleteBatch(id: string): void {
  batches = batches.filter((b) => b.id !== id);
}

export function approveBatchToLibrary(id: string): { approvedCount: number } {
  const batch = batches.find((b) => b.id === id);
  if (!batch) return { approvedCount: 0 };
  const approvedCount = batch.matchedRecords.filter(
    (r) => r.verificationStatus === "verified" && Boolean(r.question),
  ).length;
  batches = batches.map((b) =>
    b.id === id ? { ...b, status: "approved", updatedAt: now() } : b,
  );
  return { approvedCount };
}

export type { QuestionImportBatch, SourcePageItem, MatchedRecord, QuestionOption, ChoiceKey, Question };
