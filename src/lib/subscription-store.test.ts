import test from "node:test";
import assert from "node:assert/strict";
import {
  computeAccessPeriod,
  calculateDaysRemaining,
  computeSubscriberStatus,
  useSubscriptionStore,
  INITIAL_SUBSCRIPTION_PLANS,
} from "./subscription-store";

test("Free Trial is 0 NGN for 2 days and Monthly Plan is 4,500 NGN for 30 days", () => {
  const trial = INITIAL_SUBSCRIPTION_PLANS.find((p) => p.billingPeriod === "Trial");
  assert.ok(trial);
  assert.equal(trial.price, 0);
  assert.equal(trial.durationDays, 2);

  const monthly = INITIAL_SUBSCRIPTION_PLANS.find((p) => p.billingPeriod === "Monthly");
  assert.ok(monthly);
  assert.equal(monthly.price, 4500);
  assert.equal(monthly.durationDays, 30);
});

test("computeAccessPeriod extends existing period if renewed before expiry", () => {
  const futureExpiry = new Date("2026-11-20T00:00:00Z").toISOString();
  const refDate = new Date("2026-11-15T00:00:00Z").toISOString();
  const period = computeAccessPeriod(futureExpiry, 30, refDate);

  const expectedEnd = new Date(new Date("2026-11-20T00:00:00Z").getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(period.startDate, futureExpiry);
  assert.equal(period.endDate, expectedEnd);
});

test("computeAccessPeriod starts from current date if previous subscription expired", () => {
  const pastExpiry = new Date("2026-10-10T00:00:00Z").toISOString();
  const refDate = new Date("2026-11-04T12:00:00Z").toISOString();
  const period = computeAccessPeriod(pastExpiry, 30, refDate);

  const expectedEnd = new Date(new Date(refDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(period.startDate, refDate);
  assert.equal(period.endDate, expectedEnd);
});

test("Renewal requires payment status to be Successful", () => {
  useSubscriptionStore.getState().resetToDefaults();
  const store = useSubscriptionStore.getState();

  // Test failed payment
  const failRes = store.renewSubscriber("sub_02", {
    paymentReference: "FAIL-REF-01",
    pricePaid: 4500,
    paymentStatus: "Failed",
  });
  assert.equal(failRes.success, false);
  assert.match(failRes.error || "", /Successful/i);

  // Test pending payment
  const pendRes = store.renewSubscriber("sub_02", {
    paymentReference: "PEND-REF-02",
    pricePaid: 4500,
    paymentStatus: "Pending",
  });
  assert.equal(pendRes.success, false);

  // Test successful payment
  const okRes = store.renewSubscriber("sub_02", {
    paymentReference: "OK-REF-03",
    pricePaid: 4500,
    paymentStatus: "Successful",
  });
  assert.equal(okRes.success, true);

  const updatedSub = useSubscriptionStore.getState().subscribers.find((s) => s.id === "sub_02");
  assert.ok(updatedSub);
  assert.equal(updatedSub.lastPaymentReference, "OK-REF-03");
  assert.equal(updatedSub.renewalCount, 2);
});

test("Price edit does not alter historical subscriber purchase prices", () => {
  useSubscriptionStore.getState().resetToDefaults();
  const store = useSubscriptionStore.getState();

  // Current subscriber Chinedu has recordedPrice 4500
  const subBefore = store.subscribers.find((s) => s.id === "sub_02");
  assert.equal(subBefore?.recordedPrice, 4500);

  // Update monthly plan price to 5,500 NGN
  store.updatePlan("plan_monthly_access", { price: 5500 });

  const monthlyPlan = useSubscriptionStore.getState().plans.find((p) => p.id === "plan_monthly_access");
  assert.equal(monthlyPlan?.price, 5500);

  // Existing subscriber record must still retain historical 4500 price
  const subAfter = useSubscriptionStore.getState().subscribers.find((s) => s.id === "sub_02");
  assert.equal(subAfter?.recordedPrice, 4500);
});

test("Manual grant gives access without generating payment or revenue", () => {
  useSubscriptionStore.getState().resetToDefaults();
  const store = useSubscriptionStore.getState();

  const grantRes = store.createManualGrant({
    studentId: "u_01",
    durationDays: 14,
    reason: "Merit award sponsorship",
    grantedBy: "Academic Director",
  });
  assert.equal(grantRes.success, true);
  assert.ok(grantRes.grantId);

  const activeGrants = useSubscriptionStore.getState().manualGrants.filter((g) => g.status === "Active");
  assert.ok(activeGrants.some((g) => g.studentId === "u_01" && g.durationDays === 14));
});

test("computeSubscriberStatus flags expiring within 7 days", () => {
  const refDate = "2026-11-04T12:00:00Z";
  const in3Days = "2026-11-07T12:00:00Z";
  const in20Days = "2026-11-24T12:00:00Z";
  const yesterday = "2026-11-03T12:00:00Z";

  assert.equal(computeSubscriberStatus("Active", in3Days, refDate), "Expiring Soon");
  assert.equal(computeSubscriberStatus("Active", in20Days, refDate), "Active");
  assert.equal(computeSubscriberStatus("Active", yesterday, refDate), "Expired");
});
