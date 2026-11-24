import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidExamMonth,
  isValidJambSelection,
  normalizeJambSelection,
} from "../src/lib/onboarding.ts";

const available = ["english", "mathematics", "physics", "chemistry", "biology"];

test("JAMB selection always includes English and exactly three electives", () => {
  assert.equal(isValidJambSelection(["english", "mathematics", "physics", "chemistry"], available), true);
  assert.equal(isValidJambSelection(["english", "mathematics", "physics"], available), false);
  assert.equal(isValidJambSelection(["english", "mathematics", "physics", "chemistry", "biology"], available), false);
});

test("JAMB selection normalizes duplicates and unavailable subjects", () => {
  assert.deepEqual(
    normalizeJambSelection(["english", "mathematics", "physics", "physics", "chemistry", "biology", "history"], available),
    ["english", "mathematics", "physics", "chemistry"],
  );
});

test("examination month rejects malformed and past dates", () => {
  const now = new Date("2026-11-24T12:00:00");
  assert.equal(isValidExamMonth("2026-11", now), true);
  assert.equal(isValidExamMonth("2027-01", now), true);
  assert.equal(isValidExamMonth("2026-10", now), false);
  assert.equal(isValidExamMonth("2026-13", now), false);
  assert.equal(isValidExamMonth("", now), false);
});
