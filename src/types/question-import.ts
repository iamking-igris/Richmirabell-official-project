export type ChoiceKey = "A" | "B" | "C" | "D" | "E";

export interface QuestionOption {
  key: ChoiceKey | string;
  text: string;
}

export type QuestionType = "multiple_choice" | "theory";

export interface ExtractedQuestion {
  id: string;
  batchId: string;
  sourceFileId: string;
  sourceFileName: string;
  sourcePageNumber?: number;
  questionNumber: string; // Original printed label e.g. "1", "14", "5(a)"
  subpart?: string;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  solvedAnswer?: string;
  explanation?: string;
  modelAnswer?: string;
  subparts?: { label: string; prompt: string; modelAnswer: string; marks?: number }[];
  marks?: number;
  diagramDescription?: string;
  hasWarning?: boolean;
  warningDetails?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface ExtractedAnswer {
  id: string;
  batchId: string;
  sourceFileId: string;
  sourceFileName: string;
  sourcePageNumber?: number;
  questionNumber: string; // Original printed label e.g. "1", "14", "5(a)"
  subpart?: string;
  type: QuestionType;
  selectedOption?: string; // "A", "B", etc.
  answerText?: string;
  explanation?: string;
  modelAnswer?: string;
  marks?: number;
  markingGuide?: string[];
  hasWarning?: boolean;
  warningDetails?: string;
}

export type MatchStatus =
  | "matched"             // Paired by explicit original number
  | "unmatched_question"  // Question exists, answer missing
  | "orphan_answer"       // Answer exists, question missing
  | "duplicate_question"  // Multiple questions with same number
  | "duplicate_answer"    // Multiple answers with same number
  | "ambiguous";          // Ambiguous numbering or multi-conflict

export type VerificationStatus =
  | "unreviewed"
  | "needs_review"
  | "verified"
  | "excluded";

export interface MatchedRecord {
  id: string;
  batchId: string;
  originalNumber: string;
  subpart?: string;
  type: QuestionType;
  question?: ExtractedQuestion;
  answer?: ExtractedAnswer;
  matchStatus: MatchStatus;
  verificationStatus: VerificationStatus;
  matchNotes?: string;
  teacherNotes?: string;
  isExcluded?: boolean;
}

export interface SourcePageItem {
  id: string;
  fileName: string;
  fileBase64: string;
  mimeType: string;
  pageNumber: number;
  uploadedAt: string;
  extractionStatus: "pending" | "extracting" | "extracted" | "error";
  errorMessage?: string;
}

export interface QuestionImportBatch {
  id: string;
  title: string;
  subject: string;
  examType: "WAEC" | "JAMB" | "NECO" | "School Exam";
  year: string;
  paperIdentifier: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "reviewing" | "approved";
  questionSources: SourcePageItem[];
  answerSources: SourcePageItem[];
  extractedQuestions: ExtractedQuestion[];
  extractedAnswers: ExtractedAnswer[];
  matchedRecords: MatchedRecord[];
}
