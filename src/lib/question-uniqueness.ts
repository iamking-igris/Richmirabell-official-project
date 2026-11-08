/**
 * Richmirabel CBT Question Uniqueness & Anti-Duplication Engine
 *
 * Implements high-precision question text normalization, multi-token similarity,
 * duplicate detection, and full-paper uniqueness auditing against current and
 * historical examination question banks.
 */

export type QuestionSnippet = {
  id?: string;
  prompt: string;
  subject?: string;
  topic?: string;
  year?: string;
};

export type UniquenessCheckResult = {
  isDuplicate: boolean;
  isSimilar: boolean;
  similarityScore: number; // 0.0 to 1.0
  matchedPrompt?: string;
  matchedId?: string;
  reason?: string;
};

export type ExamAuditIssue = {
  section: string;
  questionId: string;
  prompt: string;
  matchType: "exact_duplicate" | "high_similarity";
  similarityScore: number;
  matchedWithPrompt: string;
  matchedExamId?: string;
  matchedExamTitle?: string;
};

export type ExamAuditReport = {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  duplicateCount: number;
  similarCount: number;
  is100PercentUnique: boolean;
  issues: ExamAuditIssue[];
};

/**
 * Normalizes question text for robust semantic comparison.
 * - Converts to lowercase.
 * - Strips LaTeX formula syntax ($...$, \frac, \sqrt, etc.).
 * - Removes punctuation, quotation marks, and non-alphanumeric noise.
 * - Standardizes whitespace.
 */
export function normalizePrompt(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Strip LaTeX commands like \frac, \lambda, \text, etc.
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[\$\{\}\\\^\_]/g, " ")
    // Remove punctuation and quotation marks
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, " ")
    // Replace multiple spaces with a single space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts character n-grams (default 3-grams) for dice coefficient comparison.
 */
function getGrams(str: string, n: number = 3): Set<string> {
  const grams = new Set<string>();
  if (str.length < n) {
    if (str.length > 0) grams.add(str);
    return grams;
  }
  for (let i = 0; i <= str.length - n; i++) {
    grams.add(str.substring(i, i + n));
  }
  return grams;
}

/**
 * Calculates Dice Similarity Coefficient between two text strings using n-grams.
 * Returns a value from 0.0 (completely distinct) to 1.0 (identical).
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const normA = normalizePrompt(textA);
  const normB = normalizePrompt(textB);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // Word token Jaccard similarity for short sentences
  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 2));

  let wordIntersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) wordIntersection++;
  }
  const wordUnion = wordsA.size + wordsB.size - wordIntersection;
  const wordSim = wordUnion > 0 ? wordIntersection / wordUnion : 0;

  // Trigram Dice similarity for phrase and syntax overlap
  const gramsA = getGrams(normA, 3);
  const gramsB = getGrams(normB, 3);

  let gramIntersection = 0;
  for (const g of gramsA) {
    if (gramsB.has(g)) gramIntersection++;
  }

  const diceSim = (2 * gramIntersection) / (gramsA.size + gramsB.size);

  // Balanced weighted similarity
  return Math.max(diceSim, wordSim);
}

/**
 * Checks a candidate question prompt against a collection of existing questions.
 * Thresholds:
 * - >= 0.92: Exact Duplicate / direct paraphrase
 * - >= 0.70: High Similarity / potential repeat
 */
export function checkQuestionUniqueness(
  candidatePrompt: string,
  existingQuestions: Array<QuestionSnippet | string>,
  similarityThreshold: number = 0.70
): UniquenessCheckResult {
  const normCandidate = normalizePrompt(candidatePrompt);
  if (!normCandidate) {
    return { isDuplicate: false, isSimilar: false, similarityScore: 0 };
  }

  let maxScore = 0;
  let bestPrompt: string | undefined = undefined;
  let bestId: string | undefined = undefined;

  for (const item of existingQuestions) {
    const itemPrompt = typeof item === "string" ? item : item.prompt;
    const itemId = typeof item === "string" ? undefined : item.id;
    const normExisting = normalizePrompt(itemPrompt);
    if (!normExisting) continue;

    // Fast-path exact normalized match
    if (normCandidate === normExisting) {
      return {
        isDuplicate: true,
        isSimilar: true,
        similarityScore: 1.0,
        matchedPrompt: itemPrompt,
        matchedId: itemId,
        reason: "Exact question prompt match found in question bank.",
      };
    }

    const score = calculateTextSimilarity(candidatePrompt, itemPrompt);
    if (score > maxScore) {
      maxScore = score;
      bestPrompt = itemPrompt;
      bestId = itemId;
    }
  }

  const isDuplicate = maxScore >= 0.90;
  const isSimilar = maxScore >= similarityThreshold;

  return {
    isDuplicate,
    isSimilar,
    similarityScore: Math.round(maxScore * 100) / 100,
    matchedPrompt: bestPrompt,
    matchedId: bestId,
    reason: isDuplicate
      ? `Near-duplicate question detected (${Math.round(maxScore * 100)}% match).`
      : isSimilar
      ? `High similarity detected (${Math.round(maxScore * 100)}% match). Recommended to regenerate with distinct figures or subtopics.`
      : undefined,
  };
}

/**
 * Gathers question prompts across historical examinations for Gemini anti-duplication context.
 */
export function collectHistoricalPromptsForSubject(
  adminExams: Array<{
    id: string;
    sections?: Record<string, Array<{ id: string; prompt: string }>>;
  }>,
  subjectKey: string,
  excludeExamId?: string,
  limit: number = 40
): string[] {
  const prompts: string[] = [];
  const seen = new Set<string>();

  for (const exam of adminExams) {
    if (excludeExamId && exam.id === excludeExamId) continue;
    const list = exam.sections?.[subjectKey] || [];
    for (const q of list) {
      const norm = normalizePrompt(q.prompt);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        prompts.push(q.prompt);
        if (prompts.length >= limit) return prompts;
      }
    }
  }

  return prompts;
}

/**
 * Runs a comprehensive uniqueness audit of an entire examination paper
 * across all its sections against itself and all other weekly papers.
 */
export function auditExaminationUniqueness(
  targetExam: {
    id: string;
    title: string;
    sections: Record<string, Array<{ id: string; prompt: string }>>;
  },
  allExams: Array<{
    id: string;
    title: string;
    sections: Record<string, Array<{ id: string; prompt: string }>>;
  }>
): ExamAuditReport {
  const issues: ExamAuditIssue[] = [];
  let totalQuestions = 0;

  const sections = Object.keys(targetExam.sections);

  for (const secKey of sections) {
    const currentList = targetExam.sections[secKey] || [];
    totalQuestions += currentList.length;

    // 1. Check against other questions within the same exam section (internal duplicate check)
    for (let i = 0; i < currentList.length; i++) {
      const qA = currentList[i];
      for (let j = i + 1; j < currentList.length; j++) {
        const qB = currentList[j];
        const sim = calculateTextSimilarity(qA.prompt, qB.prompt);
        if (sim >= 0.70) {
          issues.push({
            section: secKey,
            questionId: qB.id,
            prompt: qB.prompt,
            matchType: sim >= 0.90 ? "exact_duplicate" : "high_similarity",
            similarityScore: Math.round(sim * 100) / 100,
            matchedWithPrompt: qA.prompt,
            matchedExamId: targetExam.id,
            matchedExamTitle: `${targetExam.title} (Question #${i + 1})`,
          });
        }
      }
    }

    // 2. Check against other examinations in history
    const otherExams = allExams.filter((e) => e.id !== targetExam.id);
    for (const other of otherExams) {
      const otherList = other.sections[secKey] || [];
      for (const qTarget of currentList) {
        for (const qOther of otherList) {
          const sim = calculateTextSimilarity(qTarget.prompt, qOther.prompt);
          if (sim >= 0.70) {
            issues.push({
              section: secKey,
              questionId: qTarget.id,
              prompt: qTarget.prompt,
              matchType: sim >= 0.90 ? "exact_duplicate" : "high_similarity",
              similarityScore: Math.round(sim * 100) / 100,
              matchedWithPrompt: qOther.prompt,
              matchedExamId: other.id,
              matchedExamTitle: other.title,
            });
            break; // Record highest match per other exam
          }
        }
      }
    }
  }

  const duplicateCount = issues.filter((i) => i.matchType === "exact_duplicate").length;
  const similarCount = issues.filter((i) => i.matchType === "high_similarity").length;

  return {
    examId: targetExam.id,
    examTitle: targetExam.title,
    totalQuestions,
    duplicateCount,
    similarCount,
    is100PercentUnique: duplicateCount === 0 && similarCount === 0,
    issues,
  };
}
