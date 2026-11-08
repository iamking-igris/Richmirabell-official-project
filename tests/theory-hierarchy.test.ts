import test from "node:test";
import assert from "node:assert/strict";
import {
  getTheoryPartDepth,
  getTheoryIndentClass,
  sanitizeSvg,
  normalizeTheoryQuestion,
} from "../src/lib/theory-hierarchy.ts";

test("getTheoryPartDepth calculates depth according to WAEC/NECO conventions", () => {
  // Main questions: depth 0
  assert.equal(getTheoryPartDepth("1."), 0);
  assert.equal(getTheoryPartDepth("4."), 0);
  assert.equal(getTheoryPartDepth("Question 3"), 0);

  // Sub-questions: depth 1
  assert.equal(getTheoryPartDepth("4a."), 1);
  assert.equal(getTheoryPartDepth("4a"), 1);
  assert.equal(getTheoryPartDepth("1b"), 1);
  assert.equal(getTheoryPartDepth("(a)"), 1);

  // Sub-sub-questions: depth 2
  assert.equal(getTheoryPartDepth("4a(i)"), 2);
  assert.equal(getTheoryPartDepth("1b(ii)"), 2);
  assert.equal(getTheoryPartDepth("(i)"), 2);
  assert.equal(getTheoryPartDepth("4b(α)"), 2);
  assert.equal(getTheoryPartDepth("4b(β)"), 2);
});

test("getTheoryIndentClass returns expected margin classes", () => {
  assert.equal(getTheoryIndentClass(0), "ml-0");
  assert.equal(getTheoryIndentClass(1), "ml-4 sm:ml-6");
  assert.equal(getTheoryIndentClass(2), "ml-8 sm:ml-10");
});

test("sanitizeSvg extracts clean valid SVG code and strips unsafe tags", () => {
  const rawSvg = '```xml\n<svg viewBox="0 0 400 200"><line x1="10" y1="10" x2="100" y2="10" stroke="black"/><script>alert(1)</script></svg>\n```';
  const clean = sanitizeSvg(rawSvg);
  assert.ok(clean);
  assert.ok(clean.startsWith("<svg"));
  assert.ok(clean.endsWith("</svg>"));
  assert.ok(!clean.includes("<script>"));
});

test("normalizeTheoryQuestion normalizes hierarchical parts and legacy subparts", () => {
  const raw = {
    id: "th-test-1",
    prompt: "An electric circuit question",
    parts: [
      {
        label: "4a.",
        questionText: "Calculate effective resistance.",
        directAnswer: "R = 2.0 ohms",
        tutorExplanation: "Use 1/R = 1/R1 + 1/R2",
        marks: "[3 marks]",
      },
      {
        label: "4a(i)",
        questionText: "Determine total current.",
        directAnswer: "I = 6.0 A",
        tutorExplanation: "I = V/R",
        marks: "[2 marks]",
      },
    ],
    diagramSvg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="black"/></svg>',
  };

  const normalized = normalizeTheoryQuestion(raw);
  assert.ok(normalized.parts);
  assert.equal(normalized.parts.length, 2);
  assert.equal(normalized.parts[0].label, "4a.");
  assert.equal(normalized.parts[1].label, "4a(i)");
  assert.ok(normalized.diagramSvg);
  assert.ok(normalized.diagramSvg.includes("<circle"));
});
