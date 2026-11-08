import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuestionNumber,
  findSequenceGaps,
  matchQuestionsAndAnswers,
} from "./question-matcher.js";
import type { ExtractedQuestion, ExtractedAnswer } from "../types/question-import.js";

test("Rule & Example 1: Sequential matching across separate pages", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = [
    { id: "q1", batchId, sourceFileId: "f1", sourceFileName: "page1.jpg", questionNumber: "1", type: "multiple_choice", prompt: "Speed equation", options: [] },
    { id: "q2", batchId, sourceFileId: "f1", sourceFileName: "page1.jpg", questionNumber: "2", type: "multiple_choice", prompt: "Force unit", options: [] },
    { id: "q3", batchId, sourceFileId: "f1", sourceFileName: "page1.jpg", questionNumber: "3", type: "multiple_choice", prompt: "Ohm law", options: [] },
  ];

  const answers: ExtractedAnswer[] = [
    { id: "a1", batchId, sourceFileId: "f2", sourceFileName: "key1.jpg", questionNumber: "1", type: "multiple_choice", selectedOption: "B" },
    { id: "a2", batchId, sourceFileId: "f2", sourceFileName: "key1.jpg", questionNumber: "2", type: "multiple_choice", selectedOption: "D" },
    { id: "a3", batchId, sourceFileId: "f2", sourceFileName: "key1.jpg", questionNumber: "3", type: "multiple_choice", selectedOption: "A" },
  ];

  const { records } = matchQuestionsAndAnswers(batchId, questions, answers);
  assert.equal(records.length, 3);
  assert.equal(records[0].originalNumber, "1");
  assert.equal(records[0].matchStatus, "matched");
  assert.equal(records[0].answer?.selectedOption, "B");

  assert.equal(records[1].originalNumber, "2");
  assert.equal(records[1].matchStatus, "matched");
  assert.equal(records[1].answer?.selectedOption, "D");

  assert.equal(records[2].originalNumber, "3");
  assert.equal(records[2].matchStatus, "matched");
  assert.equal(records[2].answer?.selectedOption, "A");
});

test("Rule & Example 2: Missing answer flagged for review", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i + 1}`,
    batchId,
    sourceFileId: "f1",
    sourceFileName: "questions.pdf",
    questionNumber: String(i + 1),
    type: "multiple_choice",
    prompt: `Question ${i + 1}`,
    options: [],
  }));

  const answers: ExtractedAnswer[] = Array.from({ length: 9 }, (_, i) => ({
    id: `a${i + 1}`,
    batchId,
    sourceFileId: "f2",
    sourceFileName: "answers.pdf",
    questionNumber: String(i + 1),
    type: "multiple_choice",
    selectedOption: "A",
  }));

  const { records } = matchQuestionsAndAnswers(batchId, questions, answers);
  assert.equal(records.length, 10);
  const q10Record = records.find((r) => r.originalNumber === "10");
  assert.ok(q10Record);
  assert.equal(q10Record.matchStatus, "unmatched_question");
  assert.equal(q10Record.verificationStatus, "needs_review");
  assert.equal(q10Record.answer, undefined);
});

test("Rule & Example 3: Orphan answer preserved and shown to teacher", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = [
    { id: "q1", batchId, sourceFileId: "f1", sourceFileName: "q.jpg", questionNumber: "1", type: "multiple_choice", prompt: "Q1", options: [] },
  ];
  const answers: ExtractedAnswer[] = [
    { id: "a1", batchId, sourceFileId: "f2", sourceFileName: "a.jpg", questionNumber: "1", type: "multiple_choice", selectedOption: "C" },
    { id: "a14", batchId, sourceFileId: "f2", sourceFileName: "a.jpg", questionNumber: "14", type: "multiple_choice", selectedOption: "D", explanation: "Calculated" },
  ];

  const { records } = matchQuestionsAndAnswers(batchId, questions, answers);
  const orphan = records.find((r) => r.originalNumber === "14");
  assert.ok(orphan, "Orphan record 14 must not be discarded");
  assert.equal(orphan.matchStatus, "orphan_answer");
  assert.equal(orphan.answer?.selectedOption, "D");
  assert.equal(orphan.verificationStatus, "needs_review");
});

test("Rule & Example 4: Missing question number preserves exact numbers and flags gap", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = [
    { id: "q1", batchId, sourceFileId: "f1", sourceFileName: "p1.jpg", questionNumber: "1", type: "multiple_choice", prompt: "Q1", options: [] },
    { id: "q2", batchId, sourceFileId: "f1", sourceFileName: "p1.jpg", questionNumber: "2", type: "multiple_choice", prompt: "Q2", options: [] },
    { id: "q4", batchId, sourceFileId: "f1", sourceFileName: "p1.jpg", questionNumber: "4", type: "multiple_choice", prompt: "Q4", options: [] },
    { id: "q5", batchId, sourceFileId: "f1", sourceFileName: "p1.jpg", questionNumber: "5", type: "multiple_choice", prompt: "Q5", options: [] },
  ];

  const { records, sequenceGaps } = matchQuestionsAndAnswers(batchId, questions, []);
  assert.deepEqual(sequenceGaps, ["3"]);
  // Verify Question 4 is NOT silently changed to Question 3
  const numbers = records.map((r) => r.originalNumber);
  assert.deepEqual(numbers, ["1", "2", "4", "5"]);
});

test("Rule & Example 5: Duplicate numbering flags possible duplicate and shows source", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = [
    { id: "q7a", batchId, sourceFileId: "f1", sourceFileName: "page1.jpg", questionNumber: "7", type: "multiple_choice", prompt: "Q7 version A", options: [] },
    { id: "q7b", batchId, sourceFileId: "f2", sourceFileName: "page2.jpg", questionNumber: "7", type: "multiple_choice", prompt: "Q7 version B", options: [] },
  ];

  const { records } = matchQuestionsAndAnswers(batchId, questions, []);
  assert.equal(records.length, 2);
  assert.ok(records.every((r) => r.matchStatus === "duplicate_question"));
  assert.ok(records[0].matchNotes?.includes("Duplicate question numbering"));
});

test("Rule & Example 6: Theory subparts hierarchy preserved", () => {
  const batchId = "batch_waec_2024";
  const questions: ExtractedQuestion[] = [
    { id: "q5a", batchId, sourceFileId: "f1", sourceFileName: "theory.jpg", questionNumber: "5(a)", subpart: "(a)", type: "theory", prompt: "Define mass", options: [] },
    { id: "q5bi", batchId, sourceFileId: "f1", sourceFileName: "theory.jpg", questionNumber: "5(b)(i)", subpart: "(b)(i)", type: "theory", prompt: "Calculate acceleration", options: [] },
    { id: "q5bii", batchId, sourceFileId: "f1", sourceFileName: "theory.jpg", questionNumber: "5(b)(ii)", subpart: "(b)(ii)", type: "theory", prompt: "State unit", options: [] },
  ];

  const answers: ExtractedAnswer[] = [
    { id: "a5a", batchId, sourceFileId: "f2", sourceFileName: "marking.jpg", questionNumber: "5(a)", subpart: "(a)", type: "theory", modelAnswer: "Matter quantity" },
    { id: "a5bi", batchId, sourceFileId: "f2", sourceFileName: "marking.jpg", questionNumber: "5(b)(i)", subpart: "(b)(i)", type: "theory", modelAnswer: "a = 2 m/s^2" },
    { id: "a5bii", batchId, sourceFileId: "f2", sourceFileName: "marking.jpg", questionNumber: "5(b)(ii)", subpart: "(b)(ii)", type: "theory", modelAnswer: "m/s^2" },
  ];

  const { records } = matchQuestionsAndAnswers(batchId, questions, answers);
  assert.equal(records.length, 3);
  assert.equal(records[0].originalNumber, "5(a)");
  assert.equal(records[0].answer?.modelAnswer, "Matter quantity");

  assert.equal(records[1].originalNumber, "5(b)(i)");
  assert.equal(records[1].answer?.modelAnswer, "a = 2 m/s^2");

  assert.equal(records[2].originalNumber, "5(b)(ii)");
  assert.equal(records[2].answer?.modelAnswer, "m/s^2");
});

test("Rule & Example 7: Multiple batches isolated strictly by batch ID", () => {
  const batch1 = "paper_physics_2023";
  const batch2 = "paper_physics_2024";

  const questions: ExtractedQuestion[] = [
    { id: "p1_q1", batchId: batch1, sourceFileId: "f1", sourceFileName: "2023.jpg", questionNumber: "1", type: "multiple_choice", prompt: "2023 Question 1", options: [] },
    { id: "p2_q1", batchId: batch2, sourceFileId: "f2", sourceFileName: "2024.jpg", questionNumber: "1", type: "multiple_choice", prompt: "2024 Question 1", options: [] },
  ];

  const answers: ExtractedAnswer[] = [
    { id: "p1_a1", batchId: batch1, sourceFileId: "f3", sourceFileName: "2023_key.jpg", questionNumber: "1", type: "multiple_choice", selectedOption: "A" },
    { id: "p2_a1", batchId: batch2, sourceFileId: "f4", sourceFileName: "2024_key.jpg", questionNumber: "1", type: "multiple_choice", selectedOption: "D" },
  ];

  // Match batch 1
  const res1 = matchQuestionsAndAnswers(batch1, questions, answers);
  assert.equal(res1.records.length, 1);
  assert.equal(res1.records[0].question?.prompt, "2023 Question 1");
  assert.equal(res1.records[0].answer?.selectedOption, "A");

  // Match batch 2
  const res2 = matchQuestionsAndAnswers(batch2, questions, answers);
  assert.equal(res2.records.length, 1);
  assert.equal(res2.records[0].question?.prompt, "2024 Question 1");
  assert.equal(res2.records[0].answer?.selectedOption, "D");
});
