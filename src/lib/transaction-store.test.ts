import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFinancialSummary,
  useTransactionStore,
  type TransactionRecord,
} from "./transaction-store";

test("calculateFinancialSummary computes gross and net revenue strictly from successful and refunded payments", () => {
  const dummyTransactions: TransactionRecord[] = [
    {
      id: "t1",
      reference: "RM-01",
      studentId: "u1",
      studentName: "Student A",
      planId: "p1",
      planName: "Monthly Access",
      amount: 4500,
      currency: "NGN",
      status: "Successful",
      method: "Card",
      createdAt: 1000,
    },
    {
      id: "t2",
      reference: "RM-02",
      studentId: "u2",
      studentName: "Student B",
      planId: "p1",
      planName: "Monthly Access",
      amount: 4500,
      currency: "NGN",
      status: "Successful",
      method: "Bank transfer",
      createdAt: 2000,
    },
    {
      id: "t3",
      reference: "RM-03",
      studentId: "u3",
      studentName: "Student C",
      planId: "p1",
      planName: "Monthly Access",
      amount: 4500,
      currency: "NGN",
      status: "Pending", // Must NOT count as revenue!
      method: "Bank transfer",
      createdAt: 3000,
    },
    {
      id: "t4",
      reference: "RM-04",
      studentId: "u4",
      studentName: "Student D",
      planId: "p1",
      planName: "Monthly Access",
      amount: 4500,
      currency: "NGN",
      status: "Failed", // Must NOT count as revenue!
      method: "Card",
      createdAt: 4000,
    },
    {
      id: "t5",
      reference: "RM-05",
      studentId: "u5",
      studentName: "Student E",
      planId: "p1",
      planName: "Monthly Access",
      amount: 4500,
      currency: "NGN",
      status: "Refunded",
      method: "Card",
      createdAt: 5000,
      refundInfo: {
        refundReference: "RF-05",
        refundAmount: 4500,
        refundedAt: 6000,
        reason: "Accidental double subscription",
        processedBy: "Admin",
      },
    },
  ];

  const summary = calculateFinancialSummary(dummyTransactions);

  // Successful total (gross): 4500 * 3 = 13500 (t1, t2, t5 original)
  assert.equal(summary.totalSuccessfulRevenue, 13500);
  assert.equal(summary.totalRefundedAmount, 4500);
  // Net revenue: 13500 - 4500 = 9000
  assert.equal(summary.netRevenue, 9000);
  assert.equal(summary.successfulCount, 2);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.refundedCount, 1);
  assert.equal(summary.totalCount, 5);
});

test("Transaction store prevents duplicate references", () => {
  const store = useTransactionStore.getState();
  store.resetLedger();

  const ref = "RM-TEST-DUP-01";
  const res1 = store.recordTransaction({
    reference: ref,
    studentId: "u_02",
    studentName: "Chinedu Bello",
    amount: 4500,
    method: "Card",
    status: "Successful",
  });
  assert.equal(res1.success, true);

  const res2 = store.recordTransaction({
    reference: ref,
    studentId: "u_02",
    studentName: "Chinedu Bello",
    amount: 4500,
    method: "Card",
    status: "Successful",
  });
  assert.equal(res2.success, false);
});

test("Process refund updates transaction status and retains original record", () => {
  const store = useTransactionStore.getState();
  store.resetLedger();

  const ref = "RM-TEST-REFUND-02";
  store.recordTransaction({
    reference: ref,
    studentId: "u_02",
    studentName: "Chinedu Bello",
    amount: 4500,
    method: "Card",
    status: "Successful",
  });

  const tx = store.getTransactionByReference(ref);
  assert.ok(tx);

  const refundRes = store.processRefund({
    transactionId: tx.id,
    refundAmount: 4500,
    reason: "Candidate requested reversal",
    processedBy: "Supervisor",
  });

  assert.equal(refundRes.success, true);

  const updatedTx = store.getTransactionByReference(ref);
  assert.equal(updatedTx?.status, "Refunded");
  assert.equal(updatedTx?.refundInfo?.refundAmount, 4500);
  assert.equal(updatedTx?.refundInfo?.reason, "Candidate requested reversal");
  assert.ok(updatedTx?.refundInfo?.refundReference.startsWith("RF-"));
});

test("Process refund rejects non-successful or invalid refund amounts", () => {
  const store = useTransactionStore.getState();
  store.resetLedger();

  // Failed transaction cannot be refunded
  const failRef = "RM-TEST-FAIL-03";
  store.recordTransaction({
    reference: failRef,
    studentId: "u_04",
    studentName: "Tunde Adebayo",
    amount: 4500,
    method: "Card",
    status: "Failed",
  });

  const failTx = store.getTransactionByReference(failRef);
  assert.ok(failTx);

  const res1 = store.processRefund({
    transactionId: failTx.id,
    refundAmount: 4500,
    reason: "Test",
  });
  assert.equal(res1.success, false);
  assert.match(res1.error || "", /successful/i);
});
