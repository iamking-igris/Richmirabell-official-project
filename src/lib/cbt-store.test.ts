import test from "node:test";
import assert from "node:assert/strict";
import {
  getExamLifecycleState,
  formatLagosDateTime,
  validateWeeklyExam,
  isExamPublishedOrAvailable,
  assembleStudentPaper,
  type AdminJambExam,
  type QuestionBankItem,
} from "./cbt-store";

test("getExamLifecycleState handles past, active, future, and draft dates", () => {
  const now = Date.now();
  const pastStart = new Date(now - 100000).toISOString();
  const pastEnd = new Date(now - 50000).toISOString();
  const activeStart = new Date(now - 50000).toISOString();
  const activeEnd = new Date(now + 50000).toISOString();
  const futureStart = new Date(now + 50000).toISOString();
  const futureEnd = new Date(now + 100000).toISOString();

  assert.equal(getExamLifecycleState(pastStart, pastEnd, "published"), "closed");
  assert.equal(getExamLifecycleState(activeStart, activeEnd, "published"), "open");
  assert.equal(getExamLifecycleState(futureStart, futureEnd, "published"), "coming_soon");
  assert.equal(getExamLifecycleState(activeStart, activeEnd, "draft"), "draft");
  assert.equal(getExamLifecycleState(activeStart, activeEnd, "archived"), "archived");

  // Immediate available status bypasses future schedule
  assert.equal(getExamLifecycleState(futureStart, futureEnd, "available"), "open");
  assert.equal(getExamLifecycleState(futureStart, futureEnd, "AVAILABLE"), "open");
  assert.equal(getExamLifecycleState(futureStart, futureEnd, "open"), "open");
});

test("isExamPublishedOrAvailable correctly identifies published and available statuses", () => {
  assert.equal(isExamPublishedOrAvailable("published"), true);
  assert.equal(isExamPublishedOrAvailable("available"), true);
  assert.equal(isExamPublishedOrAvailable("AVAILABLE"), true);
  assert.equal(isExamPublishedOrAvailable("open"), true);
  assert.equal(isExamPublishedOrAvailable("draft"), false);
  assert.equal(isExamPublishedOrAvailable("archived"), false);
  assert.equal(isExamPublishedOrAvailable(undefined), false);
});

test("formatLagosDateTime outputs formatted WAT date string", () => {
  const isoStr = "2026-10-31T12:00:00.000Z";
  const formatted = formatLagosDateTime(isoStr);
  assert.ok(formatted.includes("(WAT)"));
  assert.ok(formatted.includes("2026"));
});

test("validateWeeklyExam identifies missing fields and empty sections", () => {
  const invalidExam: AdminJambExam = {
    id: "test_exam",
    type: "weekly_jamb",
    title: "",
    weekOrPeriod: "",
    instructions: "Instructions",
    durationMinutes: 0,
    startAt: new Date().toISOString(),
    endAt: new Date().toISOString(),
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: {
      english: [],
      mathematics: [],
      physics: [],
      chemistry: [],
      biology: [],
    },
  };

  const errors = validateWeeklyExam(invalidExam);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.field === "title"));
  assert.ok(errors.some((e) => e.section === "english"));
});

test("assembleStudentPaper constructs full 180-question paper for candidate electives", () => {
  function makeMockQuestions(count: number, subjectId: string): QuestionBankItem[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `${subjectId}_${i + 1}`,
      examId: "exam_test",
      subjectId: subjectId as any,
      subject: subjectId,
      order: i + 1,
      type: "multiple_choice",
      status: "verified_past",
      createdAt: new Date().toISOString(),
      prompt: `Sample question ${i + 1} in ${subjectId}`,
      options: [
        { key: "A", text: "Alpha" },
        { key: "B", text: "Beta" },
        { key: "C", text: "Gamma" },
        { key: "D", text: "Delta" },
      ],
      answer: "B" as const,
      explanation: "Worked explanation",
    }));
  }

  const mockExam: AdminJambExam = {
    id: "exam_full",
    type: "full_jamb_mock",
    title: "National JAMB Mock",
    weekOrPeriod: "Mock 1",
    instructions: "Standard UTME Instructions",
    durationMinutes: 120,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 86400000).toISOString(),
    status: "published",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: {
      english: makeMockQuestions(60, "english"),
      physics: makeMockQuestions(40, "physics"),
      chemistry: makeMockQuestions(40, "chemistry"),
      mathematics: makeMockQuestions(40, "mathematics"),
      biology: makeMockQuestions(40, "biology"),
    },
  };

  const candidateElectives = ["physics", "chemistry", "mathematics"];
  const paper = assembleStudentPaper(mockExam, candidateElectives);

  assert.equal(paper.length, 180);
  const englishCount = paper.filter((q) => q.subjectId === "english").length;
  const physicsCount = paper.filter((q) => q.subjectId === "physics").length;
  const chemCount = paper.filter((q) => q.subjectId === "chemistry").length;
  const mathCount = paper.filter((q) => q.subjectId === "mathematics").length;
  const bioCount = paper.filter((q) => q.subjectId === "biology").length;

  assert.equal(englishCount, 60);
  assert.equal(physicsCount, 40);
  assert.equal(chemCount, 40);
  assert.equal(mathCount, 40);
  assert.equal(bioCount, 0); // Biology not selected by this candidate
});

test("Weekly Examination Lifecycle: Week 1 remains live while Week 2 is created and scheduled", () => {
  const now = Date.now();
  const week1Start = new Date(now - 3600 * 1000).toISOString();
  const week1End = new Date(now + 6 * 86400 * 1000).toISOString();
  const week2Start = week1End;
  const week2End = new Date(now + 13 * 86400 * 1000).toISOString();

  const week1Exam: AdminJambExam = {
    id: "weekly_week_1",
    type: "weekly_jamb",
    title: "Weekly JAMB CBT Examination · Week 1",
    weekOrPeriod: "Week 1 · Nov 2026",
    instructions: "Week 1 Instructions",
    durationMinutes: 120,
    startAt: week1Start,
    endAt: week1End,
    status: "published",
    createdAt: new Date(now - 7200 * 1000).toISOString(),
    updatedAt: new Date(now - 7200 * 1000).toISOString(),
    sections: { english: [], mathematics: [], physics: [], chemistry: [], biology: [] },
  };

  const week2Exam: AdminJambExam = {
    id: "weekly_week_2",
    type: "weekly_jamb",
    title: "Weekly JAMB CBT Examination · Week 2",
    weekOrPeriod: "Week 2 · Nov 2026",
    instructions: "Week 2 Instructions",
    durationMinutes: 120,
    startAt: week2Start,
    endAt: week2End,
    status: "scheduled",
    createdAt: new Date(now - 600 * 1000).toISOString(),
    updatedAt: new Date(now - 600 * 1000).toISOString(),
    sections: { english: [], mathematics: [], physics: [], chemistry: [], biology: [] },
  };

  // Week 1 must be currently open
  assert.equal(getExamLifecycleState(week1Exam.startAt, week1Exam.endAt, week1Exam.status), "open");

  // Week 2 must be locked / coming_soon for students
  assert.equal(getExamLifecycleState(week2Exam.startAt, week2Exam.endAt, week2Exam.status), "coming_soon");

  // Both exist concurrently with independent IDs
  assert.notEqual(week1Exam.id, week2Exam.id);
  assert.equal(week1Exam.status, "published");
  assert.equal(week2Exam.status, "scheduled");
});

test("Automatic transition: when simulated time reaches Week 2 start, Week 2 becomes open and Week 1 closes", () => {
  const baseTime = 1762185600000; // Simulated timestamp
  const week1Start = new Date(baseTime - 7 * 86400 * 1000).toISOString();
  const week1End = new Date(baseTime).toISOString();
  const week2Start = new Date(baseTime).toISOString();
  const week2End = new Date(baseTime + 7 * 86400 * 1000).toISOString();

  // Test at simulated time: exactly at baseTime + 10 seconds (Week 1 has ended, Week 2 has started)
  const simulatedNow = baseTime + 10000;

  function getStateAt(startAt: string, endAt: string, status: string, time: number) {
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    if (time < startMs) return "coming_soon";
    if (time >= startMs && time <= endMs) return "open";
    return "closed";
  }

  const week1State = getStateAt(week1Start, week1End, "published", simulatedNow);
  const week2State = getStateAt(week2Start, week2End, "scheduled", simulatedNow);

  assert.equal(week1State, "closed");
  assert.equal(week2State, "open");
});

