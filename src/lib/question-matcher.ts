import type {
  ExtractedQuestion,
  ExtractedAnswer,
  MatchedRecord,
  MatchStatus,
  VerificationStatus,
} from "@/types/question-import";

/**
 * Normalizes question labels for robust deterministic matching
 * Examples:
 *  "1." -> "1"
 *  "Q1" -> "1"
 *  "Question 14" -> "14"
 *  "12(b)(ii)" -> "12(b)(ii)"
 *  "5(a)" -> "5(a)"
 */
export function normalizeQuestionNumber(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip common prefixes: "Question", "Quest", "Q.", "Q", "No.", "No"
  clean = clean.replace(/^(?:question|quest|no\.?|q\.?)\s*/i, "");
  // Strip trailing punctuation like '.', ':', '-'
  clean = clean.replace(/[\.\:\-]+$/, "").trim();
  return clean;
}

/**
 * Identifies numerical gaps in a list of question numbers
 * e.g., ["1", "2", "4", "5"] -> ["3"]
 */
export function findSequenceGaps(numbers: string[]): string[] {
  const integerNumbers: number[] = [];
  for (const n of numbers) {
    const parsed = parseInt(n, 10);
    if (!isNaN(parsed) && String(parsed) === n) {
      integerNumbers.push(parsed);
    }
  }

  if (integerNumbers.length <= 1) return [];

  integerNumbers.sort((a, b) => a - b);
  const min = integerNumbers[0];
  const max = integerNumbers[integerNumbers.length - 1];
  const presentSet = new Set(integerNumbers);
  const gaps: string[] = [];

  for (let i = min; i <= max; i++) {
    if (!presentSet.has(i)) {
      gaps.push(String(i));
    }
  }

  return gaps;
}

/**
 * Matches extracted questions and extracted answers strictly within the same batch.
 * Applies the 10 rules and handles all edge cases without ever dropping or renumbering data.
 */
export function matchQuestionsAndAnswers(
  batchId: string,
  questions: ExtractedQuestion[],
  answers: ExtractedAnswer[],
  existingRecords: MatchedRecord[] = []
): { records: MatchedRecord[]; sequenceGaps: string[] } {
  // 1. Filter strictly to current batch
  const batchQuestions = questions.filter((q) => q.batchId === batchId);
  const batchAnswers = answers.filter((a) => a.batchId === batchId);

  // Map existing records by normalized number to preserve manual teacher edits/verifications
  const existingMap = new Map<string, MatchedRecord>();
  for (const r of existingRecords) {
    if (r.batchId === batchId) {
      existingMap.set(normalizeQuestionNumber(r.originalNumber), r);
    }
  }

  // 2. Group questions by normalized question number
  const questionsByNum = new Map<string, ExtractedQuestion[]>();
  for (const q of batchQuestions) {
    const key = normalizeQuestionNumber(q.questionNumber);
    if (!questionsByNum.has(key)) {
      questionsByNum.set(key, []);
    }
    questionsByNum.get(key)!.push(q);
  }

  // 3. Group answers by normalized question number
  const answersByNum = new Map<string, ExtractedAnswer[]>();
  for (const a of batchAnswers) {
    const key = normalizeQuestionNumber(a.questionNumber);
    if (!answersByNum.has(key)) {
      answersByNum.set(key, []);
    }
    answersByNum.get(key)!.push(a);
  }

  const allNumbers = new Set<string>([
    ...Array.from(questionsByNum.keys()),
    ...Array.from(answersByNum.keys()),
  ]);

  const records: MatchedRecord[] = [];

  // Sort question numbers naturally (integers first, then alphanumeric)
  const sortedNumbers = Array.from(allNumbers).sort((a, b) => {
    const intA = parseInt(a, 10);
    const intB = parseInt(b, 10);
    if (!isNaN(intA) && !isNaN(intB)) {
      if (intA !== intB) return intA - intB;
      return a.localeCompare(b);
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });

  for (const numKey of sortedNumbers) {
    const qList = questionsByNum.get(numKey) || [];
    const aList = answersByNum.get(numKey) || [];
    const prev = existingMap.get(numKey);

    // Case 1: Duplicate questions (multiple questions share the same number)
    if (qList.length > 1) {
      for (let i = 0; i < qList.length; i++) {
        const q = qList[i];
        records.push({
          id: prev?.id || `rec-${batchId}-${numKey}-dup-${i}`,
          batchId,
          originalNumber: q.questionNumber,
          subpart: q.subpart,
          type: q.type,
          question: q,
          answer: aList[0], // associate if available, but flag as duplicate
          matchStatus: "duplicate_question",
          verificationStatus: prev?.verificationStatus || "needs_review",
          matchNotes: `Duplicate question numbering detected: Question ${numKey} appears multiple times in source files (${qList.map((x) => x.sourceFileName).join(", ")})`,
          teacherNotes: prev?.teacherNotes,
          isExcluded: prev?.isExcluded || false,
        });
      }
      continue;
    }

    // Case 2: Duplicate answers (multiple answer entries for same number)
    if (aList.length > 1 && qList.length === 1) {
      const q = qList[0];
      records.push({
        id: prev?.id || `rec-${batchId}-${numKey}`,
        batchId,
        originalNumber: q.questionNumber,
        subpart: q.subpart,
        type: q.type,
        question: q,
        answer: aList[0],
        matchStatus: "duplicate_answer",
        verificationStatus: prev?.verificationStatus || "needs_review",
        matchNotes: `Conflicting answer keys: Multiple answer records found for Question ${numKey} (${aList.map((x) => x.selectedOption || "Answer").join(", ")})`,
        teacherNotes: prev?.teacherNotes,
        isExcluded: prev?.isExcluded || false,
      });
      continue;
    }

    // Case 3: Exactly 1 question and 1 answer -> Matched!
    if (qList.length === 1 && aList.length === 1) {
      const q = qList[0];
      const a = aList[0];
      const hasWarning = q.hasWarning || a.hasWarning;
      records.push({
        id: prev?.id || `rec-${batchId}-${numKey}`,
        batchId,
        originalNumber: q.questionNumber,
        subpart: q.subpart || a.subpart,
        type: q.type || a.type || "multiple_choice",
        question: q,
        answer: a,
        matchStatus: "matched",
        verificationStatus: prev?.verificationStatus || (hasWarning ? "needs_review" : "unreviewed"),
        matchNotes: hasWarning
          ? `Matched by Question ${numKey}, but contains warnings: ${q.warningDetails || a.warningDetails}`
          : `Matched with answer key (${a.sourceFileName})`,
        teacherNotes: prev?.teacherNotes,
        isExcluded: prev?.isExcluded || false,
      });
      continue;
    }

    // Case 4: Question present, but answer missing -> Unmatched Question
    if (qList.length === 1 && aList.length === 0) {
      const q = qList[0];
      records.push({
        id: prev?.id || `rec-${batchId}-${numKey}`,
        batchId,
        originalNumber: q.questionNumber,
        subpart: q.subpart,
        type: q.type,
        question: q,
        answer: prev?.answer, // keep manual teacher assignment if any
        matchStatus: prev?.answer ? "matched" : "unmatched_question",
        verificationStatus: prev?.verificationStatus || "needs_review",
        matchNotes: prev?.answer ? "Manually paired with answer" : `Answer key missing for Question ${numKey}`,
        teacherNotes: prev?.teacherNotes,
        isExcluded: prev?.isExcluded || false,
      });
      continue;
    }

    // Case 5: Answer present, but question missing -> Orphan Answer
    if (qList.length === 0 && aList.length >= 1) {
      for (let i = 0; i < aList.length; i++) {
        const a = aList[i];
        records.push({
          id: prev?.id || `rec-${batchId}-${numKey}-orphan-${i}`,
          batchId,
          originalNumber: a.questionNumber,
          subpart: a.subpart,
          type: a.type,
          question: prev?.question,
          answer: a,
          matchStatus: "orphan_answer",
          verificationStatus: prev?.verificationStatus || "needs_review",
          matchNotes: `Orphan answer: Answer ${a.questionNumber} (${a.selectedOption || "Key"}) has no matching question on question pages`,
          teacherNotes: prev?.teacherNotes,
          isExcluded: prev?.isExcluded || false,
        });
      }
      continue;
    }
  }

  // Calculate sequence gaps in question numbering
  const questionNumbers = batchQuestions.map((q) => normalizeQuestionNumber(q.questionNumber));
  const sequenceGaps = findSequenceGaps(questionNumbers);

  return { records, sequenceGaps };
}
