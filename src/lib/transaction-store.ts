import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedPayments } from "@/data/seed-admin";
import type { PaymentRecord } from "@/lib/payments";

export type TransactionStatus = "Successful" | "Pending" | "Failed" | "Refunded";

export type TransactionRecord = {
  id: string; // Internal stable transaction ID e.g. "tx_01"
  reference: string; // Unique payment reference e.g. "RM-4A7C1B"
  studentId: string; // Student ID e.g. "u_02" or "s01"
  studentName: string; // Candidate name e.g. "Chinedu Bello"
  studentIdNumber?: string; // Formatted registration number e.g. "STU-2026-002"
  studentEmail?: string;
  planId: string; // "plan_monthly_access"
  planName: string; // "Monthly Access"
  amount: number; // in NGN e.g. 4500
  currency: string; // "NGN"
  status: TransactionStatus;
  method: "Card" | "Bank transfer" | "USSD";
  createdAt: number; // timestamp in ms
  confirmedAt?: number; // timestamp in ms when confirmed successful
  subscriptionId?: string; // Associated subscription record ID e.g. "sub_02"
  accessPeriod?: {
    startDate: string;
    endDate: string;
  };
  failureReason?: string;
  refundInfo?: {
    refundReference: string;
    refundAmount: number;
    refundedAt: number;
    reason: string;
    processedBy: string;
  };
  internalNotes?: string;
};

export type FinancialSummary = {
  totalSuccessfulRevenue: number;
  totalRefundedAmount: number;
  netRevenue: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  totalCount: number;
  averageTransactionValue: number;
};

function createInitialTransactions(): TransactionRecord[] {
  return [];
}

// Financial calculation utility - Pure, deterministic, strict accounting
export function calculateFinancialSummary(transactions: TransactionRecord[]): FinancialSummary {
  let successfulTotal = 0;
  let refundedTotal = 0;
  let successfulCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let refundedCount = 0;

  for (const t of transactions) {
    if (t.status === "Successful") {
      successfulTotal += t.amount;
      successfulCount++;
    } else if (t.status === "Refunded") {
      // Account for original transaction amount in gross, and refund in deductions
      successfulTotal += t.amount;
      const refAmt = t.refundInfo?.refundAmount ?? t.amount;
      refundedTotal += refAmt;
      refundedCount++;
    } else if (t.status === "Pending") {
      pendingCount++;
    } else if (t.status === "Failed") {
      failedCount++;
    }
  }

  const netRevenue = successfulTotal - refundedTotal;
  const countForAvg = successfulCount + refundedCount;
  const avg = countForAvg > 0 ? Math.round(successfulTotal / countForAvg) : 0;

  return {
    totalSuccessfulRevenue: successfulTotal,
    totalRefundedAmount: refundedTotal,
    netRevenue,
    successfulCount,
    pendingCount,
    failedCount,
    refundedCount,
    totalCount: transactions.length,
    averageTransactionValue: avg,
  };
}

export type TransactionStoreState = {
  transactions: TransactionRecord[];

  // Core Actions
  recordTransaction: (input: {
    reference: string;
    studentId: string;
    studentName: string;
    studentEmail?: string;
    studentIdNumber?: string;
    planId?: string;
    planName?: string;
    amount: number;
    method: "Card" | "Bank transfer" | "USSD";
    status: TransactionStatus;
    subscriptionId?: string;
    accessPeriod?: { startDate: string; endDate: string };
    failureReason?: string;
    internalNotes?: string;
  }) => { success: boolean; transaction?: TransactionRecord };

  updateInternalNotes: (transactionId: string, notes: string) => void;

  processRefund: (input: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    processedBy?: string;
  }) => { success: boolean; error?: string };

  getTransactionByReference: (ref: string) => TransactionRecord | undefined;
  getTransactionsForStudent: (studentId: string) => TransactionRecord[];
  getSummary: () => FinancialSummary;
  resetLedger: () => void;
};

export const useTransactionStore = create<TransactionStoreState>()(
  persist(
    (set, get) => ({
      transactions: createInitialTransactions(),

      recordTransaction: (input) => {
        // Prevent duplicate transaction references
        const existing = get().transactions.find((t) => t.reference === input.reference);
        if (existing) {
          return { success: false, transaction: existing };
        }

        const now = Date.now();
        const newRecord: TransactionRecord = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          reference: input.reference,
          studentId: input.studentId,
          studentName: input.studentName,
          studentEmail: input.studentEmail,
          studentIdNumber: input.studentIdNumber,
          planId: input.planId || "plan_monthly_access",
          planName: input.planName || "Monthly Access",
          amount: input.amount,
          currency: "NGN",
          status: input.status,
          method: input.method,
          createdAt: now,
          confirmedAt: input.status === "Successful" ? now : undefined,
          subscriptionId: input.subscriptionId,
          accessPeriod: input.accessPeriod,
          failureReason: input.failureReason,
          internalNotes: input.internalNotes,
        };

        set((state) => ({ transactions: [newRecord, ...state.transactions] }));
        return { success: true, transaction: newRecord };
      },

      updateInternalNotes: (transactionId, notes) => {
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === transactionId || t.reference === transactionId ? { ...t, internalNotes: notes } : t)),
        }));
      },

      processRefund: ({ transactionId, refundAmount, reason, processedBy = "Admin (Finance)" }) => {
        const tx = get().transactions.find((t) => t.id === transactionId || t.reference === transactionId);
        if (!tx) return { success: false, error: "Transaction not found." };
        if (tx.status !== "Successful") {
          return { success: false, error: "Only confirmed successful transactions can be refunded." };
        }
        if (refundAmount <= 0 || refundAmount > tx.amount) {
          return { success: false, error: `Refund amount must be between ₦1 and ₦${tx.amount.toLocaleString("en-NG")}.` };
        }

        const refundRef = `RF-${Date.now().toString(36).toUpperCase()}`;
        const updatedTx: TransactionRecord = {
          ...tx,
          status: "Refunded",
          refundInfo: {
            refundReference: refundRef,
            refundAmount,
            refundedAt: Date.now(),
            reason,
            processedBy,
          },
        };

        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === tx.id ? updatedTx : t)),
        }));

        return { success: true };
      },

      getTransactionByReference: (ref) => {
        return get().transactions.find((t) => t.reference === ref);
      },

      getTransactionsForStudent: (studentId) => {
        return get().transactions.filter((t) => t.studentId === studentId || t.studentName.toLowerCase() === studentId.toLowerCase());
      },

      getSummary: () => {
        return calculateFinancialSummary(get().transactions);
      },

      resetLedger: () => {
        set({ transactions: createInitialTransactions() });
      },
    }),
    {
      name: "richmirabel-admin-payments-ledger",
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<TransactionStoreState>;
        const raw = state.transactions ?? [];
        const cleaned = raw.filter((t) => !t.studentEmail?.endsWith("@example.com") && !t.reference.startsWith("RM-"));
        return { ...state, transactions: cleaned };
      },
    }
  )
);
