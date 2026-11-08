import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePrompt,
  calculateTextSimilarity,
  checkQuestionUniqueness,
  auditExaminationUniqueness,
} from "./question-uniqueness";

test("normalizePrompt cleans punctuation, LaTeX commands, and whitespace", () => {
  const raw = "What is the velocity $v = f\\lambda$ of a wave, if $\\lambda = 2.5\\text{ m}$?";
  const cleaned = normalizePrompt(raw);
  assert.equal(cleaned, "what is the velocity v f of a wave if 2 5 m");
});

test("Exact identical questions return 1.0 similarity and flag as duplicate", () => {
  const prompt1 = "A stone thrown horizontally with a velocity of 15 m/s reaches the ground in 3 seconds.";
  const prompt2 = "A stone thrown horizontally with a velocity of 15 m/s reaches the ground in 3 seconds.";
  const sim = calculateTextSimilarity(prompt1, prompt2);
  assert.equal(sim, 1.0);

  const res = checkQuestionUniqueness(prompt1, [{ prompt: prompt2 }]);
  assert.equal(res.isDuplicate, true);
  assert.equal(res.similarityScore, 1.0);
});

test("Minor phrasing variations return high similarity (>0.70) and flag as near-duplicate", () => {
  const qA = "Calculate the electrical energy consumed by a 2.0 kW electric kettle used for 30 minutes.";
  const qB = "Find the electrical energy consumed by a 2.0 kW electric kettle in 30 minutes.";
  const sim = calculateTextSimilarity(qA, qB);
  assert.ok(sim >= 0.70, `Expected similarity >= 0.70, got ${sim}`);

  const res = checkQuestionUniqueness(qB, [{ prompt: qA }]);
  assert.equal(res.isSimilar, true);
});

test("Genuinely distinct questions in same subject have low similarity (<0.40)", () => {
  const physics1 = "A stone thrown horizontally with a velocity of 15 m/s reaches the ground in 3 seconds. Calculate height.";
  const physics2 = "Which optical instrument produces an image that is virtual, erect, and magnified?";
  const sim = calculateTextSimilarity(physics1, physics2);
  assert.ok(sim < 0.40, `Expected similarity < 0.40, got ${sim}`);

  const res = checkQuestionUniqueness(physics2, [{ prompt: physics1 }]);
  assert.equal(res.isDuplicate, false);
  assert.equal(res.isSimilar, false);
});

test("auditExaminationUniqueness flags cross-exam and internal duplicates", () => {
  const week1Exam = {
    id: "week_1",
    title: "Weekly JAMB Exam · Week 1",
    sections: {
      physics: [
        { id: "w1_p1", prompt: "A stone thrown horizontally with a velocity of 15 m/s reaches ground in 3 seconds." },
      ],
      chemistry: [],
      biology: [],
      english: [],
      mathematics: [],
    },
  };

  const week2Exam = {
    id: "week_2",
    title: "Weekly JAMB Exam · Week 2",
    sections: {
      physics: [
        // Reused from Week 1:
        { id: "w2_p1", prompt: "A stone thrown horizontally with a velocity of 15 m/s reaches ground in 3 seconds." },
        // Fresh unique question:
        { id: "w2_p2", prompt: "Calculate the root mean square velocity of oxygen molecules at standard temperature." },
      ],
      chemistry: [],
      biology: [],
      english: [],
      mathematics: [],
    },
  };

  const report = auditExaminationUniqueness(week2Exam, [week1Exam, week2Exam]);
  assert.equal(report.is100PercentUnique, false);
  assert.equal(report.duplicateCount, 1);
  assert.equal(report.issues[0].questionId, "w2_p1");
  assert.equal(report.issues[0].matchedExamTitle, "Weekly JAMB Exam · Week 1");
});
