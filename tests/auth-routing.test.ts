import test from "node:test";
import assert from "node:assert/strict";
import { postAuthDestination } from "../src/lib/auth-routing.ts";

test("postAuthDestination sends admins to admin dashboard", () => {
  assert.equal(postAuthDestination({ role: "ADMIN", onboarding_complete: false }), "/admin");
});

test("postAuthDestination sends incomplete student onboarding to start", () => {
  assert.equal(postAuthDestination({ role: "STUDENT", onboarding_complete: false }), "/start");
});

test("postAuthDestination sends onboarded students to studio", () => {
  assert.equal(postAuthDestination({ role: "STUDENT", onboarding_complete: true }), "/studio");
});
