import test from "node:test";
import assert from "node:assert/strict";

import { classifyAiExtractionFailure } from "../src/lib/content-errors";

test("maps daily quota exhaustion to a safe admin message", () => {
  const result = classifyAiExtractionFailure({
    statusCode: 429,
    code: "daily_quota_exhausted",
    message: "RESOURCE_EXHAUSTED",
  });

  assert.equal(result.kind, "daily_quota_exhausted");
  assert.match(result.message, /daily request quota has been reached/i);
});

test("maps temporary rate limits to a wait-and-retry message", () => {
  const result = classifyAiExtractionFailure({
    statusCode: 429,
    code: "rate_limit",
    message: "Too many requests",
  });

  assert.equal(result.kind, "rate_limit");
  assert.match(result.message, /temporarily busy|retry safely/i);
});

test("maps invalid structured output to a preserved-work message", () => {
  const result = classifyAiExtractionFailure({
    statusCode: 500,
    code: "invalid_structured_output",
    message: "Could not parse structured output from the AI response.",
  });

  assert.equal(result.kind, "invalid_output");
  assert.match(result.message, /existing work has been preserved|retry this extraction stage/i);
});
