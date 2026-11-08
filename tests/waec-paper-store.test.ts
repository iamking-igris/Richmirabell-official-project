import test from "node:test";
import assert from "node:assert/strict";
import {
  useWaecPaperStore,
  getPublishedWaecPapers,
  buildPracticeSet,
  findWaecPaper,
  type WaecPaper,
} from "../src/lib/waec-paper-store.ts";

test("useWaecPaperStore loads seed papers", () => {
  const papers = useWaecPaperStore.getState().papers;
  assert.ok(papers.length >= 4, "Should have at least 4 seed papers");
  const physics2024 = papers.find((p) => p.subject === "Physics" && String(p.year) === "2024");
  assert.ok(physics2024, "Should find Physics 2024 paper");
  assert.equal(physics2024.status, "published");
  assert.ok(physics2024.objectives.length > 0, "Should have objective questions");
  assert.ok(physics2024.theory.length > 0, "Should have theory questions");
});

test("checkDuplicate detects same subject and year (case-insensitive)", () => {
  const store = useWaecPaperStore.getState();
  const dup = store.checkDuplicate("physics", "2024");
  assert.ok(dup, "Should flag duplicate for physics 2024");
  assert.equal(dup.id, "waec-physics-2024");

  const nonDup = store.checkDuplicate("Physics", "1999");
  assert.equal(nonDup, undefined, "Should not flag non-existent year");
});

test("addPaper rejects duplicate subject and year", () => {
  const store = useWaecPaperStore.getState();
  const result = store.addPaper({
    id: "dup-test",
    subject: "Physics",
    subjectId: "physics",
    year: "2024",
    title: "Duplicate Physics 2024",
    status: "draft",
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
    objectives: [],
    theory: [],
    timerSeconds: 3600,
  });
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("already exists"));
});

test("addPaper allows new subject and year", () => {
  const store = useWaecPaperStore.getState();
  const result = store.addPaper({
    id: "biology-2023",
    subject: "Biology",
    subjectId: "biology",
    year: "2023",
    title: "WAEC Biology 2023",
    status: "published",
    createdAt: "2026-10-31",
    updatedAt: "2026-10-31",
    objectives: [
      {
        id: "bio-1",
        prompt: "The basic unit of life is the",
        options: [
          { key: "A", text: "cell" },
          { key: "B", text: "tissue" },
          { key: "C", text: "organ" },
          { key: "D", text: "system" },
        ],
        answer: "A",
        explain: "The cell is the structural and functional unit of all living organisms.",
      },
    ],
    theory: [],
    timerSeconds: 3000,
  });
  assert.equal(result.ok, true);
  const found = findWaecPaper("biology-2023");
  assert.ok(found);
  assert.equal(found.subject, "Biology");
});

test("buildPracticeSet caps at max 50 and handles sections", () => {
  // Test objective only for Physics 2024
  const setObj = buildPracticeSet({
    subject: "Physics",
    subjectId: "physics",
    yearMode: "specific",
    year: "2024",
    sections: "objective",
    questionCount: 50,
  });
  assert.ok(setObj.questions.length > 0);
  assert.ok(setObj.questions.every((q) => !("theory" in q && q.theory)));
  assert.ok(setObj.questions.length <= 50);

  // Test theory only for Physics 2024
  const setTheory = buildPracticeSet({
    subject: "Physics",
    subjectId: "physics",
    yearMode: "specific",
    year: "2024",
    sections: "theory",
    questionCount: 10,
  });
  assert.ok(setTheory.questions.length > 0);
  assert.ok(setTheory.questions.every((q) => "theory" in q && q.theory));

  // Test mixed years
  const setMixed = buildPracticeSet({
    subject: "Physics",
    subjectId: "physics",
    yearMode: "mixed",
    sections: "both",
    questionCount: 50,
  });
  assert.ok(setMixed.questions.length > setObj.questions.length, "Mixed set should include 2024 and 2023 questions");
});
