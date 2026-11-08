import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateUtmeScore } from "./utme-scoring";
import type { Choice } from "@/data/catalog";

type QuestionItem = {
  id: string;
  subjectId: string;
  subject: string;
  pick?: Choice;
  answer: Choice;
};

function buildSubjectQuestions(
  subjectId: string,
  subjectLabel: string,
  totalCount: number,
  correctCount: number,
  answeredCount: number = totalCount
): QuestionItem[] {
  const items: QuestionItem[] = [];

  for (let i = 0; i < totalCount; i++) {
    const isAnswered = i < answeredCount;
    const isCorrect = i < correctCount;

    items.push({
      id: `${subjectId}_${i + 1}`,
      subjectId,
      subject: subjectLabel,
      pick: isAnswered ? (isCorrect ? "A" : "B") : undefined,
      answer: "A",
    });
  }

  return items;
}

test("Test A: Perfect 100% across all 4 subjects yields 400/400", () => {
  const items = [
    ...buildSubjectQuestions("english", "Use of English", 60, 60),
    ...buildSubjectQuestions("mathematics", "Mathematics", 40, 40),
    ...buildSubjectQuestions("physics", "Physics", 40, 40),
    ...buildSubjectQuestions("chemistry", "Chemistry", 40, 40),
  ];

  const result = calculateUtmeScore(items);

  assert.equal(result.rawTotal, 180);
  assert.equal(result.rawCorrect, 180);
  assert.equal(result.exactUtmeScore, 400);
  assert.equal(result.utmeScore, 400);
  assert.equal(result.accuracy, 100);

  assert.equal(result.subjectBreakdown.english.utmeScore, 100);
  assert.equal(result.subjectBreakdown.mathematics.utmeScore, 100);
  assert.equal(result.subjectBreakdown.physics.utmeScore, 100);
  assert.equal(result.subjectBreakdown.chemistry.utmeScore, 100);
});

test("Test B: 50% across all 4 subjects yields 200/400", () => {
  const items = [
    ...buildSubjectQuestions("english", "Use of English", 60, 30),
    ...buildSubjectQuestions("mathematics", "Mathematics", 40, 20),
    ...buildSubjectQuestions("physics", "Physics", 40, 20),
    ...buildSubjectQuestions("chemistry", "Chemistry", 40, 20),
  ];

  const result = calculateUtmeScore(items);

  assert.equal(result.rawTotal, 180);
  assert.equal(result.rawCorrect, 90);
  assert.equal(result.exactUtmeScore, 200);
  assert.equal(result.utmeScore, 200);
  assert.equal(result.accuracy, 50);

  assert.equal(result.subjectBreakdown.english.utmeScore, 50);
  assert.equal(result.subjectBreakdown.mathematics.utmeScore, 50);
  assert.equal(result.subjectBreakdown.physics.utmeScore, 50);
  assert.equal(result.subjectBreakdown.chemistry.utmeScore, 50);
});

test("Test C: Specific subject breakdown (70, 75, 62.5, 80) yields 287.5 exact, 288 rounded", () => {
  const items = [
    ...buildSubjectQuestions("english", "Use of English", 60, 42),      // (42/60)*100 = 70.0
    ...buildSubjectQuestions("mathematics", "Mathematics", 40, 30),  // (30/40)*100 = 75.0
    ...buildSubjectQuestions("physics", "Physics", 40, 25),          // (25/40)*100 = 62.5
    ...buildSubjectQuestions("chemistry", "Chemistry", 40, 32),      // (32/40)*100 = 80.0
  ];

  const result = calculateUtmeScore(items);

  assert.equal(result.rawTotal, 180);
  assert.equal(result.rawCorrect, 129);
  assert.equal(result.exactUtmeScore, 287.5);
  assert.equal(result.utmeScore, 288);

  assert.equal(result.subjectBreakdown.english.utmeScore, 70);
  assert.equal(result.subjectBreakdown.mathematics.utmeScore, 75);
  assert.equal(result.subjectBreakdown.physics.exactUtmeScore, 62.5);
  assert.equal(result.subjectBreakdown.chemistry.utmeScore, 80);
});

test("Test D: Zero questions answered yields 0/400 and 0% accuracy without division by zero errors", () => {
  const items = [
    ...buildSubjectQuestions("english", "Use of English", 60, 0, 0),
    ...buildSubjectQuestions("mathematics", "Mathematics", 40, 0, 0),
    ...buildSubjectQuestions("physics", "Physics", 40, 0, 0),
    ...buildSubjectQuestions("chemistry", "Chemistry", 40, 0, 0),
  ];

  const result = calculateUtmeScore(items);

  assert.equal(result.rawTotal, 180);
  assert.equal(result.rawCorrect, 0);
  assert.equal(result.rawAnswered, 0);
  assert.equal(result.exactUtmeScore, 0);
  assert.equal(result.utmeScore, 0);
  assert.equal(result.accuracy, 0);
  assert.ok(!Number.isNaN(result.accuracy));
});

test("Test E: Only 7 questions answered, 3 correct (Accuracy = 42.86%)", () => {
  const items = [
    ...buildSubjectQuestions("english", "Use of English", 60, 3, 7), // 7 answered, 3 correct in English
    ...buildSubjectQuestions("mathematics", "Mathematics", 40, 0, 0),
    ...buildSubjectQuestions("physics", "Physics", 40, 0, 0),
    ...buildSubjectQuestions("chemistry", "Chemistry", 40, 0, 0),
  ];

  const result = calculateUtmeScore(items);

  assert.equal(result.rawTotal, 180);
  assert.equal(result.rawCorrect, 3);
  assert.equal(result.rawAnswered, 7);
  assert.equal(result.accuracy, 42.86);

  // English exact score = (3/60)*100 = 5.0
  assert.equal(result.exactUtmeScore, 5);
  assert.equal(result.utmeScore, 5);
});
