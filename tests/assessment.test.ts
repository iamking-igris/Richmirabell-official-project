import test from "node:test";
import assert from "node:assert/strict";

function scoreObjective(questions: any[], picks: Record<string, string | undefined>) {
  let score = 0, total = 0, marked = 0;
  for (const q of questions) {
    if (q.answer == null || q.answerKeyStatus === "missing") continue;
    total += 1; marked += 1;
    if (picks[q.id] === q.answer) score += 1;
  }
  return { score, total, marked };
}

function attemptsByKind(attempts: any[]) {
  return {
    topic: attempts.filter((a) => a.kind === "topic" || !a.kind),
    jamb: attempts.filter((a) => a.kind === "jamb"),
    waec: attempts.filter((a) => a.kind === "waec"),
  };
}

test("scoreObjective computes correct score and marks", () => {
  const questions = [
    { id: "q1", answer: "A", answerKeyStatus: "shipped" },
    { id: "q2", answer: "B", answerKeyStatus: "shipped" },
    { id: "q3", answer: "C", answerKeyStatus: "missing" },
  ];
  const picks = { q1: "A", q2: "D" };
  const result = scoreObjective(questions, picks);
  assert.equal(result.score, 1);
  assert.equal(result.total, 2); // q3 missing key excluded
});

test("attemptsByKind splits attempts accurately", () => {
  const attempts = [
    { id: "1", kind: "topic" },
    { id: "2", kind: "waec" },
    { id: "3", kind: "jamb" },
    { id: "4" },
  ];
  const split = attemptsByKind(attempts);
  assert.equal(split.topic.length, 2);
  assert.equal(split.waec.length, 1);
  assert.equal(split.jamb.length, 1);
});
