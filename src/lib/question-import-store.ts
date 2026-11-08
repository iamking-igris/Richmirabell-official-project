import type {
  QuestionImportBatch,
  SourcePageItem,
  ExtractedQuestion,
  ExtractedAnswer,
  MatchedRecord,
} from "@/types/question-import";
import { matchQuestionsAndAnswers } from "@/lib/question-matcher";
import { loadOps, saveOps } from "@/lib/admin-ops";

const STORAGE_KEY = "richmirabel-question-batches";

const SEED_BATCHES: QuestionImportBatch[] = [];

export function loadQuestionBatches(): QuestionImportBatch[] {
  if (typeof localStorage === "undefined") return SEED_BATCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveQuestionBatches(SEED_BATCHES);
      return SEED_BATCHES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_BATCHES;
  } catch {
    return SEED_BATCHES;
  }
}

export function saveQuestionBatches(batches: QuestionImportBatch[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch (err) {
    console.error("Failed to save question batches to localStorage:", err);
  }
}

export function createNewBatch(meta: {
  title: string;
  subject: string;
  examType: "WAEC" | "JAMB" | "NECO" | "School Exam";
  year: string;
  paperIdentifier: string;
  description?: string;
}): QuestionImportBatch {
  const newBatch: QuestionImportBatch = {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: meta.title.trim() || `${meta.subject} ${meta.examType} ${meta.year}`,
    subject: meta.subject.trim() || "Physics",
    examType: meta.examType,
    year: meta.year.trim() || "2024",
    paperIdentifier: meta.paperIdentifier.trim() || "Paper 1",
    description: meta.description?.trim(),
    createdAt: new Date().toLocaleString("en-NG"),
    updatedAt: new Date().toLocaleString("en-NG"),
    status: "draft",
    questionSources: [],
    answerSources: [],
    extractedQuestions: [],
    extractedAnswers: [],
    matchedRecords: [],
  };

  const batches = loadQuestionBatches();
  batches.unshift(newBatch);
  saveQuestionBatches(batches);
  return newBatch;
}

export function updateBatch(
  batchId: string,
  patch: Partial<QuestionImportBatch>
): QuestionImportBatch | null {
  const batches = loadQuestionBatches();
  const idx = batches.findIndex((b) => b.id === batchId);
  if (idx === -1) return null;

  const current = batches[idx];
  const updated: QuestionImportBatch = {
    ...current,
    ...patch,
    updatedAt: new Date().toLocaleString("en-NG"),
  };

  // If questions or answers were updated, recompute matching
  if (patch.extractedQuestions || patch.extractedAnswers) {
    const qList = patch.extractedQuestions || current.extractedQuestions;
    const aList = patch.extractedAnswers || current.extractedAnswers;
    const existingRecs = patch.matchedRecords || current.matchedRecords;
    const { records } = matchQuestionsAndAnswers(batchId, qList, aList, existingRecs);
    updated.matchedRecords = records;
  }

  batches[idx] = updated;
  saveQuestionBatches(batches);
  return updated;
}

export function deleteBatch(batchId: string): boolean {
  const batches = loadQuestionBatches();
  const filtered = batches.filter((b) => b.id !== batchId);
  if (filtered.length === batches.length) return false;
  saveQuestionBatches(filtered);
  return true;
}

export function approveBatchToLibrary(batchId: string): {
  approvedCount: number;
  batch: QuestionImportBatch | null;
} {
  const batches = loadQuestionBatches();
  const idx = batches.findIndex((b) => b.id === batchId);
  if (idx === -1) return { approvedCount: 0, batch: null };

  const batch = batches[idx];
  // Filter only records that are not excluded
  const verifiedRecords = batch.matchedRecords.filter((r) => !r.isExcluded);

  // Update batch status
  batch.status = "approved";
  batch.updatedAt = new Date().toLocaleString("en-NG");
  batches[idx] = batch;
  saveQuestionBatches(batches);

  // Record audit log according to project conventions in admin-ops
  try {
    const ops = loadOps();
    ops.audit.unshift({
      id: `audit_${Date.now()}`,
      actor: "admin",
      action: "Approved Question OCR Batch",
      target: `${batch.examType} ${batch.subject} (${batch.year})`,
      at: new Date().toLocaleString("en-NG"),
      reason: `${verifiedRecords.length} verified questions approved for library`,
    });
    saveOps(ops);
  } catch {}

  return { approvedCount: verifiedRecords.length, batch };
}
