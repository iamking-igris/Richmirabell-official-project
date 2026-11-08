import { test } from "node:test";
import assert from "node:assert/strict";
import {
  useSettingsStore,
  calculateTotalCbtQuestions,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_ACADEMIC_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_AI_PREFERENCES,
} from "./settings-store";

test("calculateTotalCbtQuestions computes 180 questions for 1 English (60) + 3 electives (40 each)", () => {
  const total = calculateTotalCbtQuestions(DEFAULT_ACADEMIC_SETTINGS);
  assert.equal(total, 180);
});

test("calculateTotalCbtQuestions reacts properly to custom question counts", () => {
  const custom = {
    ...DEFAULT_ACADEMIC_SETTINGS,
    cbtEnglishQuestions: 50,
    cbtOtherSubjectQuestions: 35,
    requiredSubjectCount: 4,
  };
  // 50 + 3 * 35 = 50 + 105 = 155
  assert.equal(calculateTotalCbtQuestions(custom), 155);
});

test("useSettingsStore updates general settings correctly", () => {
  const store = useSettingsStore.getState();
  store.updateGeneralSettings({
    platformName: "Richmirabel Academy CBT Centre",
    supportEmail: "helpdesk@richmirabel.ng",
    maintenanceMode: true,
  });

  const updated = useSettingsStore.getState().general;
  assert.equal(updated.platformName, "Richmirabel Academy CBT Centre");
  assert.equal(updated.supportEmail, "helpdesk@richmirabel.ng");
  assert.equal(updated.maintenanceMode, true);
  assert.equal(updated.timezone, DEFAULT_GENERAL_SETTINGS.timezone); // untouched
});

test("useSettingsStore updates academic settings correctly", () => {
  const store = useSettingsStore.getState();
  store.updateAcademicSettings({
    cbtExamDurationMinutes: 110,
    showDetailedExplanations: false,
  });

  const updated = useSettingsStore.getState().academic;
  assert.equal(updated.cbtExamDurationMinutes, 110);
  assert.equal(updated.showDetailedExplanations, false);
  assert.equal(updated.compulsorySubject, "English Language");
});

test("useSettingsStore updates notification preferences correctly", () => {
  const store = useSettingsStore.getState();
  store.updateNotificationSettings({
    notifyExpiry7Days: false,
    notifyAdminDailyDigest: true,
  });

  const updated = useSettingsStore.getState().notifications;
  assert.equal(updated.notifyExpiry7Days, false);
  assert.equal(updated.notifyAdminDailyDigest, true);
  assert.equal(updated.notifyPaymentReceipt, true);
});

test("useSettingsStore updates admin profile correctly", () => {
  const store = useSettingsStore.getState();
  store.updateAdminProfile({
    name: "Chief Academic Director",
    phone: "+234 809 999 8888",
  });

  const updated = useSettingsStore.getState().adminProfile;
  assert.equal(updated.name, "Chief Academic Director");
  assert.equal(updated.phone, "+234 809 999 8888");
});

test("useSettingsStore resets all settings to default cleanly", () => {
  const store = useSettingsStore.getState();
  store.resetSettingsToDefault();

  const current = useSettingsStore.getState();
  assert.equal(current.general.platformName, DEFAULT_GENERAL_SETTINGS.platformName);
  assert.equal(current.academic.cbtExamDurationMinutes, 120);
  assert.equal(current.notifications.notifyExpiry7Days, true);
  assert.equal(current.ai.defaultModel, DEFAULT_AI_PREFERENCES.defaultModel);
});
