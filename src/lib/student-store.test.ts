import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateStudentOverviewStats,
  filterAndSortStudents,
  INITIAL_DEMO_STUDENTS,
  useStudentStore,
  type StudentRecord,
} from "./student-store";

test("calculateStudentOverviewStats calculates correct numbers from demo student list", () => {
  const stats = calculateStudentOverviewStats(INITIAL_DEMO_STUDENTS);

  assert.equal(stats.total, 5);
  assert.equal(stats.active, 4); // Adaeze, Chinedu, Fatima, Ngozi
  assert.equal(stats.suspended, 1); // Tunde
  assert.equal(stats.trial, 1); // Adaeze
  assert.equal(stats.paid, 2); // Chinedu, Fatima
  assert.equal(stats.expired, 1); // Tunde
  assert.equal(stats.manual, 1); // Ngozi
});

test("filterAndSortStudents searches by student name, email, and student ID", () => {
  // Search by name
  const byName = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { query: "Adaeze" });
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, "u_01");

  // Search by email
  const byEmail = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { query: "chinedu@example.com" });
  assert.equal(byEmail.length, 1);
  assert.equal(byEmail[0].id, "u_02");

  // Search by ID number
  const byId = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { query: "STU-2026-003" });
  assert.equal(byId.length, 1);
  assert.equal(byId[0].name, "Fatima Yusuf");

  // Non-matching query returns empty
  const noMatch = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { query: "xyznonexistent" });
  assert.equal(noMatch.length, 0);
});

test("filterAndSortStudents filters by status and access plan accurately", () => {
  const activeOnly = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { filter: "Active" });
  assert.equal(activeOnly.length, 4);
  assert.ok(activeOnly.every((s) => s.status === "Active"));

  const suspendedOnly = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { filter: "Suspended" });
  assert.equal(suspendedOnly.length, 1);
  assert.equal(suspendedOnly[0].id, "u_04");

  const paidOnly = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { filter: "Paid" });
  assert.equal(paidOnly.length, 2);

  const trialOnly = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { filter: "Trial" });
  assert.equal(trialOnly.length, 1);
  assert.equal(trialOnly[0].name, "Adaeze Okonkwo");

  const manualOnly = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { filter: "Manual" });
  assert.equal(manualOnly.length, 1);
  assert.equal(manualOnly[0].name, "Ngozi Eze");
});

test("filterAndSortStudents filters by selected JAMB subject", () => {
  const biologyStudents = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { subject: "Biology" });
  // Chinedu (Physics, Math, Bio, Eng), Fatima (Chem, Bio, Math, Eng), Tunde (Phys, Chem, Bio, Eng)
  assert.equal(biologyStudents.length, 3);
  assert.ok(biologyStudents.every((s) => s.jambSubjects.includes("Biology")));

  const physicsStudents = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { subject: "Physics" });
  // Adaeze, Chinedu, Tunde, Ngozi
  assert.equal(physicsStudents.length, 4);
});

test("filterAndSortStudents sorts alphabetically and by registration date", () => {
  const nameAsc = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { sortBy: "name_asc" });
  assert.equal(nameAsc[0].name, "Adaeze Okonkwo");
  assert.equal(nameAsc[nameAsc.length - 1].name, "Tunde Adebayo");

  const nameDesc = filterAndSortStudents(INITIAL_DEMO_STUDENTS, { sortBy: "name_desc" });
  assert.equal(nameDesc[0].name, "Tunde Adebayo");
  assert.equal(nameDesc[nameDesc.length - 1].name, "Adaeze Okonkwo");
});

test("useStudentStore suspends and restores student while keeping subscription separate", () => {
  const store = useStudentStore.getState();

  // Suspend Adaeze (u_01)
  store.suspendStudent("u_01");
  const suspendedAdaeze = useStudentStore.getState().getStudentById("u_01");
  assert.equal(suspendedAdaeze?.status, "Suspended");
  assert.equal(suspendedAdaeze?.accessPlan, "Trial"); // subscription stays intact

  // Overview stats reflect suspended immediately
  const statsAfterSuspend = calculateStudentOverviewStats(useStudentStore.getState().students);
  assert.equal(statsAfterSuspend.suspended, 2);
  assert.equal(statsAfterSuspend.active, 3);

  // Restore Adaeze
  store.restoreStudent("u_01");
  const restoredAdaeze = useStudentStore.getState().getStudentById("u_01");
  assert.equal(restoredAdaeze?.status, "Active");
  assert.equal(restoredAdaeze?.accessPlan, "Trial"); // still Trial, not magically Paid
});

test("useStudentStore enforces 4 JAMB subjects with English compulsory during profile edit", () => {
  const store = useStudentStore.getState();

  // Missing English
  const res1 = store.updateStudentProfile("u_01", {
    jambSubjects: ["Physics", "Chemistry", "Mathematics", "Biology"],
  });
  assert.equal(res1.success, false);
  assert.match(res1.error || "", /English/i);

  // Less than 4 subjects
  const res2 = store.updateStudentProfile("u_01", {
    jambSubjects: ["English", "Physics", "Chemistry"],
  });
  assert.equal(res2.success, false);
  assert.match(res2.error || "", /4 subjects/i);

  // Valid 4 subjects with English
  const res3 = store.updateStudentProfile("u_01", {
    jambSubjects: ["English", "Physics", "Chemistry", "Biology"],
  });
  assert.equal(res3.success, true);
  const updated = useStudentStore.getState().getStudentById("u_01");
  assert.deepEqual(updated?.jambSubjects, ["English", "Physics", "Chemistry", "Biology"]);
});
