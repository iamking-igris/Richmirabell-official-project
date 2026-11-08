import type { Choice } from "@/data/catalog";

export type SubjectScoreDetail = {
  subjectId: string;
  subjectLabel: string;
  correct: number;
  total: number;
  answered: number;
  wrong: number;
  unanswered: number;
  utmeScore: number;       // Rounded score out of 100 for this subject
  exactUtmeScore: number;  // Exact float score out of 100
  maxUtmeScore: number;    // Always 100
  accuracy: number;        // (correct / answered) * 100 or 0
};

export type UtmeScoreResult = {
  utmeScore: number;        // Final rounded score out of 400
  exactUtmeScore: number;   // Exact float score out of 400
  maxUtmeScore: number;     // Always 400
  rawCorrect: number;       // Raw total correct answers (e.g. 129 / 180)
  rawTotal: number;         // Raw total questions (180)
  rawAnswered: number;      // Questions candidate picked an answer for
  rawWrong: number;         // Answered incorrectly
  rawUnanswered: number;    // Skipped questions
  accuracy: number;         // (rawCorrect / rawAnswered) * 100 or 0
  percentage: number;       // (exactUtmeScore / 400) * 100
  subjectBreakdown: Record<string, SubjectScoreDetail>;
};

const KNOWN_SUBJECT_LABELS: Record<string, string> = {
  english: "Use of English",
  mathematics: "Mathematics",
  math: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

/**
 * Calculates official 400-point JAMB UTME equivalent score.
 * Formula:
 * - Use of English (60 Qs): (correct / 60) * 100
 * - Electives (40 Qs each): (correct / 40) * 100
 * Total Score = Sum of 4 subject scores (out of 400).
 */
export function calculateUtmeScore(
  items: Array<{
    id?: string;
    subjectId?: string;
    subject?: string;
    pick?: Choice;
    answer?: Choice;
    theory?: boolean;
    written?: string;
  }>,
  explicitPicks?: Record<string, Choice>
): UtmeScoreResult {
  const groups: Record<
    string,
    {
      subjectId: string;
      subjectLabel: string;
      correct: number;
      total: number;
      answered: number;
      wrong: number;
      unanswered: number;
    }
  > = {};

  if (Array.isArray(items)) {
    for (const item of items) {
      const rawSub = (item.subjectId || item.subject || "english").toLowerCase().trim();
      let subKey = rawSub;
      if (subKey === "math") subKey = "mathematics";

      if (!groups[subKey]) {
        const label =
          KNOWN_SUBJECT_LABELS[subKey] ||
          (item.subject && item.subject !== "General" ? item.subject : subKey.charAt(0).toUpperCase() + subKey.slice(1));
        groups[subKey] = {
          subjectId: subKey,
          subjectLabel: label,
          correct: 0,
          total: 0,
          answered: 0,
          wrong: 0,
          unanswered: 0,
        };
      }

      const g = groups[subKey];
      g.total += 1;

      const pick = item.id && explicitPicks ? explicitPicks[item.id] ?? item.pick : item.pick;
      const answer = item.answer;

      if (!pick) {
        g.unanswered += 1;
      } else {
        g.answered += 1;
        if (answer != null && pick === answer) {
          g.correct += 1;
        } else {
          g.wrong += 1;
        }
      }
    }
  }

  let totalExactUtmeScore = 0;
  let rawCorrect = 0;
  let rawTotal = 0;
  let rawAnswered = 0;
  let rawWrong = 0;
  let rawUnanswered = 0;

  const subjectBreakdown: Record<string, SubjectScoreDetail> = {};

  for (const [subKey, g] of Object.entries(groups)) {
    rawCorrect += g.correct;
    rawTotal += g.total;
    rawAnswered += g.answered;
    rawWrong += g.wrong;
    rawUnanswered += g.unanswered;

    const targetCount = g.total > 0 ? g.total : subKey === "english" ? 60 : 40;
    const exactSubScore = (g.correct / targetCount) * 100;
    totalExactUtmeScore += exactSubScore;

    const acc = g.answered > 0 ? Number(((g.correct / g.answered) * 100).toFixed(2)) : 0;

    subjectBreakdown[subKey] = {
      subjectId: subKey,
      subjectLabel: g.subjectLabel,
      correct: g.correct,
      total: g.total,
      answered: g.answered,
      wrong: g.wrong,
      unanswered: g.unanswered,
      utmeScore: Math.round(exactSubScore),
      exactUtmeScore: Number(exactSubScore.toFixed(2)),
      maxUtmeScore: 100,
      accuracy: acc,
    };
  }

  const roundedUtmeScore = Math.round(totalExactUtmeScore);
  const accuracy = rawAnswered > 0 ? Number(((rawCorrect / rawAnswered) * 100).toFixed(2)) : 0;
  const percentage = Number(((totalExactUtmeScore / 400) * 100).toFixed(1));

  return {
    utmeScore: roundedUtmeScore,
    exactUtmeScore: Number(totalExactUtmeScore.toFixed(2)),
    maxUtmeScore: 400,
    rawCorrect,
    rawTotal,
    rawAnswered,
    rawWrong,
    rawUnanswered,
    accuracy,
    percentage,
    subjectBreakdown,
  };
}

/**
 * Retrieves or computes UTME 400-point score for any attempt record.
 */
export function getAttemptUtmeResult(attempt: {
  utmeScore?: number;
  exactUtmeScore?: number;
  score: number;
  total: number;
  items?: any[];
  picks?: Record<string, Choice>;
}): UtmeScoreResult {
  if (attempt.items && attempt.items.length > 0) {
    return calculateUtmeScore(attempt.items, attempt.picks);
  }

  // Fallback for legacy attempts without item snapshots
  const rawCorrect = attempt.score;
  const rawTotal = attempt.total || 180;
  const rawAnswered = attempt.score; // best estimate if unanswered unknown
  const approxScore = Math.round((attempt.score / Math.max(rawTotal, 1)) * 400);

  return {
    utmeScore: attempt.utmeScore ?? approxScore,
    exactUtmeScore: attempt.exactUtmeScore ?? approxScore,
    maxUtmeScore: 400,
    rawCorrect,
    rawTotal,
    rawAnswered,
    rawWrong: Math.max(0, rawTotal - rawCorrect),
    rawUnanswered: 0,
    accuracy: rawTotal > 0 ? Number(((rawCorrect / rawTotal) * 100).toFixed(2)) : 0,
    percentage: Number(((approxScore / 400) * 100).toFixed(1)),
    subjectBreakdown: {},
  };
}
