import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useStudentStore, type StudentRecord } from "@/lib/student-store";

export type BillingPeriod = "Monthly" | "Trial" | "One-off";

export type PlanFeatureKey =
  | "digitized_notes"
  | "subtopic_quizzes"
  | "waec_past_questions"
  | "weekly_jamb_cbt"
  | "full_jamb_mock"
  | "progress_performance"
  | "learning_guides";

export type PlanFeatureDefinition = {
  key: PlanFeatureKey;
  label: string;
  description: string;
};

export const AVAILABLE_PLAN_FEATURES: PlanFeatureDefinition[] = [
  { key: "digitized_notes", label: "Digitised Notes", description: "Full structured theory syllabus notes with inline mathematical equations" },
  { key: "subtopic_quizzes", label: "Subtopic Quizzes", description: "Targeted subtopic practice drills with instant marking and answer explanations" },
  { key: "waec_past_questions", label: "WAEC Past Questions", description: "WAEC past papers with verified answers and comprehensive tutor solutions" },
  { key: "weekly_jamb_cbt", label: "Weekly JAMB CBT", description: "Scheduled weekly 4-subject UTME simulation papers timed strictly for 120 minutes" },
  { key: "full_jamb_mock", label: "Full JAMB Mock", description: "Comprehensive UTME exam hall simulations with 400-point national scoring benchmark" },
  { key: "progress_performance", label: "Progress & Performance Centre", description: "Topic mastery ratios, accuracy analytics, and study habit tracking" },
  { key: "learning_guides", label: "Learning & Exam Guides", description: "Syllabus breakdowns, high-yield examination tips, and revision roadmaps" },
];

export type SubscriptionPlan = {
  id: string; // e.g. "plan_free_trial" or "plan_monthly_access"
  name: string;
  shortDescription: string;
  price: number; // in NGN (0 for trial, 4500 for monthly)
  billingPeriod: BillingPeriod;
  durationDays: number; // 2 for trial, 30 for monthly
  features: PlanFeatureKey[];
  isActive: boolean;
  displayOrder: number;
  recommendedLabel?: string; // e.g. "Most Popular" or "Recommended"
  createdAt: string;
  updatedAt: string;
};

export type SubscriberStatus = "Active" | "Trial" | "Expiring Soon" | "Expired" | "Cancelled" | "Pending Payment";

export type SubscriptionHistoryEvent = {
  id: string;
  timestamp: string; // ISO string
  type:
    | "subscription_created"
    | "payment_confirmed"
    | "renewal_completed"
    | "access_period_started"
    | "access_period_expired"
    | "manual_extension"
    | "access_revoked"
    | "subscription_cancelled";
  title: string;
  description: string;
  priceCharged?: number;
  paymentReference?: string;
  operator?: string; // "Student" | "Admin (Manual)" | "System"
};

export type SubscriptionRecord = {
  id: string; // e.g. "sub_01"
  studentId: string; // references StudentRecord.id (e.g. "u_02")
  studentName: string;
  studentEmail: string;
  studentIdNumber: string;
  planId: string;
  planName: string;
  recordedPrice: number; // Historical price locked at purchase time
  startDate: string; // ISO date string e.g. "2026-09-18T00:00:00Z"
  endDate: string; // Current period end date
  nextRenewalDate?: string;
  status: SubscriberStatus;
  lastPaymentReference?: string;
  lastPaymentDate?: string;
  renewalCount: number;
  history: SubscriptionHistoryEvent[];
  notes?: string;
};

export type ManualAccessGrant = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentIdNumber: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  grantedBy: string;
  grantedAt: string;
  status: "Active" | "Expired" | "Revoked";
  revokedAt?: string;
  revokedReason?: string;
};

export type MonthlyActivitySummary = {
  newSubscriptions: number;
  renewals: number;
  expirations: number;
  revocations: number;
};

// Initial default plans according to business specifications
export const INITIAL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_free_trial",
    name: "Free Trial",
    shortDescription: "48-hour complimentary evaluation pass for new candidates",
    price: 0,
    billingPeriod: "Trial",
    durationDays: 2,
    features: [
      "digitized_notes",
      "subtopic_quizzes",
      "progress_performance",
      "learning_guides",
    ],
    isActive: true,
    displayOrder: 1,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "plan_monthly_access",
    name: "Monthly Access",
    shortDescription: "Complete monthly access to notes, quizzes, WAEC papers, and weekly JAMB CBT",
    price: 4500,
    billingPeriod: "Monthly",
    durationDays: 30,
    features: [
      "digitized_notes",
      "subtopic_quizzes",
      "waec_past_questions",
      "weekly_jamb_cbt",
      "full_jamb_mock",
      "progress_performance",
      "learning_guides",
    ],
    isActive: true,
    displayOrder: 2,
    recommendedLabel: "Recommended for UTME 2027",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
];

export const INITIAL_SUBSCRIBERS: SubscriptionRecord[] = [];
export const INITIAL_MANUAL_GRANTS: ManualAccessGrant[] = [];

export type SubscriptionStoreState = {
  plans: SubscriptionPlan[];
  subscribers: SubscriptionRecord[];
  manualGrants: ManualAccessGrant[];

  // Plan Management Actions
  createPlan: (input: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">) => { success: boolean; planId?: string };
  updatePlan: (id: string, updates: Partial<Omit<SubscriptionPlan, "id" | "createdAt">>) => { success: boolean };
  togglePlanActive: (id: string) => void;
  deletePlan: (id: string) => { success: boolean; error?: string };

  // Subscriber Management Actions
  renewSubscriber: (
    subscriberId: string,
    options: {
      paymentReference: string;
      pricePaid: number;
      paymentStatus: "Successful" | "Failed" | "Pending";
      durationDays?: number;
      operator?: string;
    }
  ) => { success: boolean; error?: string };
  extendSubscriberAccess: (subscriberId: string, additionalDays: number, reason: string) => { success: boolean };
  revokeSubscriberAccess: (subscriberId: string, reason: string) => { success: boolean };
  cancelSubscription: (subscriberId: string, reason: string) => { success: boolean };

  // Manual Access Actions
  createManualGrant: (input: {
    studentId: string;
    durationDays: number;
    reason: string;
    grantedBy?: string;
  }) => { success: boolean; grantId?: string; error?: string };
  extendManualGrant: (grantId: string, additionalDays: number) => { success: boolean };
  revokeManualGrant: (grantId: string, reason: string) => { success: boolean };

  // Sync / Utilities
  getActiveMonthlyPlan: () => SubscriptionPlan;
  getSubscriberByStudentId: (studentId: string) => SubscriptionRecord | undefined;
  getManualGrantByStudentId: (studentId: string) => ManualAccessGrant | undefined;
  resetToDefaults: () => void;
};

// Date helper for 30-day calculations in WAT / ISO
export function computeAccessPeriod(
  currentEndDateStr: string | undefined,
  durationDays: number = 30,
  referenceDateStr?: string
): { startDate: string; endDate: string } {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const currentEnd = currentEndDateStr ? new Date(currentEndDateStr) : null;

  let start: Date;
  let end: Date;

  if (currentEnd && currentEnd.getTime() > refDate.getTime()) {
    // Student renews before expiry: extend from existing end date
    start = currentEnd;
    end = new Date(currentEnd.getTime() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    // Expired or new: start from reference date
    start = refDate;
    end = new Date(refDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

// Calculate days remaining until expiry
export function calculateDaysRemaining(endDateStr: string, referenceDateStr?: string): number {
  const now = referenceDateStr ? new Date(referenceDateStr).getTime() : new Date().getTime();
  const end = new Date(endDateStr).getTime();
  const diffMs = end - now;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

// Derive dynamic subscriber status based on end date
export function computeSubscriberStatus(
  baseStatus: SubscriberStatus,
  endDateStr: string,
  referenceDateStr?: string
): SubscriberStatus {
  if (baseStatus === "Cancelled" || baseStatus === "Pending Payment") return baseStatus;
  const daysLeft = calculateDaysRemaining(endDateStr, referenceDateStr);
  if (daysLeft <= 0) return "Expired";
  if (baseStatus === "Trial") return "Trial";
  if (daysLeft <= 7) return "Expiring Soon";
  return "Active";
}

export const useSubscriptionStore = create<SubscriptionStoreState>()(
  persist(
    (set, get) => ({
      plans: INITIAL_SUBSCRIPTION_PLANS,
      subscribers: INITIAL_SUBSCRIBERS,
      manualGrants: INITIAL_MANUAL_GRANTS,

      getActiveMonthlyPlan: () => {
        const found = get().plans.find((p) => p.isActive && p.billingPeriod === "Monthly");
        if (found) return found;
        return (
          get().plans.find((p) => p.billingPeriod === "Monthly") || INITIAL_SUBSCRIPTION_PLANS[1]
        );
      },

      getSubscriberByStudentId: (studentId) => {
        return get().subscribers.find((s) => s.studentId === studentId);
      },

      getManualGrantByStudentId: (studentId) => {
        return get().manualGrants.find((g) => g.studentId === studentId && g.status === "Active");
      },

      createPlan: (input) => {
        const newId = `plan_${Date.now()}`;
        const newPlan: SubscriptionPlan = {
          ...input,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ plans: [...state.plans, newPlan] }));
        return { success: true, planId: newId };
      },

      updatePlan: (id, updates) => {
        set((state) => ({
          plans: state.plans.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        return { success: true };
      },

      togglePlanActive: (id) => {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() } : p)),
        }));
      },

      deletePlan: (id) => {
        const plan = get().plans.find((p) => p.id === id);
        if (!plan) return { success: false, error: "Plan not found" };
        if (plan.id === "plan_free_trial" || plan.id === "plan_monthly_access") {
          return { success: false, error: "Core plans cannot be deleted. You may deactivate them instead." };
        }
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }));
        return { success: true };
      },

      renewSubscriber: (subscriberId, options) => {
        const sub = get().subscribers.find((s) => s.id === subscriberId);
        if (!sub) return { success: false, error: "Subscriber not found" };

        // Critical rule: payment must be successful to grant access
        if (options.paymentStatus !== "Successful") {
          // Log failed attempt into history
          const failEvent: SubscriptionHistoryEvent = {
            id: `evt_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "renewal_completed",
            title: `Renewal Payment Failed (${options.paymentStatus})`,
            description: `Attempted renewal for ₦${options.pricePaid.toLocaleString("en-NG")} failed or was pending. Access was not extended.`,
            priceCharged: options.pricePaid,
            paymentReference: options.paymentReference,
            operator: options.operator || "Student",
          };
          set((state) => ({
            subscribers: state.subscribers.map((s) =>
              s.id === subscriberId ? { ...s, history: [failEvent, ...s.history] } : s
            ),
          }));
          return {
            success: false,
            error: `Payment status is ${options.paymentStatus}. Access cannot be extended without a verified successful payment.`,
          };
        }

        const days = options.durationDays || 30;
        const period = computeAccessPeriod(sub.endDate, days);

        const successEvent: SubscriptionHistoryEvent = {
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "renewal_completed",
          title: "Monthly Renewal Completed",
          description: `Successfully renewed monthly access for ${days} days. Reference: ${options.paymentReference}.`,
          priceCharged: options.pricePaid,
          paymentReference: options.paymentReference,
          operator: options.operator || "Student",
        };

        const updatedSub: SubscriptionRecord = {
          ...sub,
          startDate: period.startDate,
          endDate: period.endDate,
          nextRenewalDate: new Date(new Date(period.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          status: "Active",
          recordedPrice: options.pricePaid,
          lastPaymentReference: options.paymentReference,
          lastPaymentDate: new Date().toISOString(),
          renewalCount: sub.renewalCount + 1,
          history: [successEvent, ...sub.history],
        };

        set((state) => ({
          subscribers: state.subscribers.map((s) => (s.id === subscriberId ? updatedSub : s)),
        }));

        // Synchronize with student store
        try {
          useStudentStore.getState().updateStudentAccess(sub.studentId, "Paid", {
            planName: "Monthly Access",
            expiryDate: period.endDate.slice(0, 10),
          });
        } catch {
          // safe in isolated test environments
        }

        return { success: true };
      },

      extendSubscriberAccess: (subscriberId, additionalDays, reason) => {
        const sub = get().subscribers.find((s) => s.id === subscriberId);
        if (!sub) return { success: false };

        const currentEnd = new Date(sub.endDate).getTime() > Date.now() ? new Date(sub.endDate) : new Date();
        const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

        const event: SubscriptionHistoryEvent = {
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "manual_extension",
          title: `Access Extended (${additionalDays} Days)`,
          description: reason || `Admin granted ${additionalDays} days extension.`,
          operator: "Admin (Manual)",
        };

        set((state) => ({
          subscribers: state.subscribers.map((s) =>
            s.id === subscriberId
              ? {
                  ...s,
                  endDate: newEnd.toISOString(),
                  status: "Active",
                  history: [event, ...s.history],
                }
              : s
          ),
        }));

        try {
          useStudentStore.getState().updateStudentAccess(sub.studentId, "Paid", {
            expiryDate: newEnd.toISOString().slice(0, 10),
          });
        } catch {
          // ignore
        }

        return { success: true };
      },

      revokeSubscriberAccess: (subscriberId, reason) => {
        const sub = get().subscribers.find((s) => s.id === subscriberId);
        if (!sub) return { success: false };

        const event: SubscriptionHistoryEvent = {
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "access_revoked",
          title: "Access Revoked by Administrator",
          description: reason || "Administrator revoked active access period.",
          operator: "Admin (Manual)",
        };

        set((state) => ({
          subscribers: state.subscribers.map((s) =>
            s.id === subscriberId
              ? {
                  ...s,
                  status: "Expired",
                  endDate: new Date().toISOString(),
                  history: [event, ...s.history],
                }
              : s
          ),
        }));

        try {
          useStudentStore.getState().updateStudentAccess(sub.studentId, "Expired", {
            expiryDate: new Date().toISOString().slice(0, 10),
          });
        } catch {
          // ignore
        }

        return { success: true };
      },

      cancelSubscription: (subscriberId, reason) => {
        const sub = get().subscribers.find((s) => s.id === subscriberId);
        if (!sub) return { success: false };

        const event: SubscriptionHistoryEvent = {
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "subscription_cancelled",
          title: "Subscription Cancelled",
          description: reason || "Subscription cancelled by administrator.",
          operator: "Admin",
        };

        set((state) => ({
          subscribers: state.subscribers.map((s) =>
            s.id === subscriberId ? { ...s, status: "Cancelled", history: [event, ...s.history] } : s
          ),
        }));

        return { success: true };
      },

      createManualGrant: ({ studentId, durationDays, reason, grantedBy = "Admin" }) => {
        // Look up student from student store
        let student: StudentRecord | undefined;
        try {
          student = useStudentStore.getState().students.find((s) => s.id === studentId);
        } catch {
          // ignore
        }

        if (!student) {
          // fallback search in subscribers
          const matchSub = get().subscribers.find((s) => s.studentId === studentId);
          if (matchSub) {
            student = {
              id: matchSub.studentId,
              name: matchSub.studentName,
              email: matchSub.studentEmail,
              studentIdNumber: matchSub.studentIdNumber,
            } as any;
          }
        }

        if (!student) {
          return { success: false, error: "Candidate record not found." };
        }

        const now = new Date();
        const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const grantId = `grant_${Date.now()}`;

        const newGrant: ManualAccessGrant = {
          id: grantId,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentIdNumber: student.studentIdNumber,
          startDate: now.toISOString(),
          endDate: end.toISOString(),
          durationDays,
          reason,
          grantedBy,
          grantedAt: now.toISOString(),
          status: "Active",
        };

        set((state) => ({ manualGrants: [newGrant, ...state.manualGrants] }));

        // Critical business rule: Manual grant updates student access to "Manual"
        // It does NOT create a payment record or increase revenue!
        try {
          useStudentStore.getState().updateStudentAccess(student.id, "Manual", {
            planName: `Manual Grant (${durationDays} Days)`,
            expiryDate: end.toISOString().slice(0, 10),
            manualGrantReason: reason,
          });
        } catch {
          // ignore
        }

        return { success: true, grantId };
      },

      extendManualGrant: (grantId, additionalDays) => {
        const grant = get().manualGrants.find((g) => g.id === grantId);
        if (!grant) return { success: false };

        const currentEnd = new Date(grant.endDate).getTime() > Date.now() ? new Date(grant.endDate) : new Date();
        const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

        set((state) => ({
          manualGrants: state.manualGrants.map((g) =>
            g.id === grantId
              ? {
                  ...g,
                  endDate: newEnd.toISOString(),
                  durationDays: g.durationDays + additionalDays,
                  status: "Active",
                }
              : g
          ),
        }));

        try {
          useStudentStore.getState().updateStudentAccess(grant.studentId, "Manual", {
            expiryDate: newEnd.toISOString().slice(0, 10),
          });
        } catch {
          // ignore
        }

        return { success: true };
      },

      revokeManualGrant: (grantId, reason) => {
        const grant = get().manualGrants.find((g) => g.id === grantId);
        if (!grant) return { success: false };

        set((state) => ({
          manualGrants: state.manualGrants.map((g) =>
            g.id === grantId
              ? {
                  ...g,
                  status: "Revoked",
                  revokedAt: new Date().toISOString(),
                  revokedReason: reason,
                }
              : g
          ),
        }));

        try {
          useStudentStore.getState().updateStudentAccess(grant.studentId, "Expired", {
            expiryDate: new Date().toISOString().slice(0, 10),
          });
        } catch {
          // ignore
        }

        return { success: true };
      },

      resetToDefaults: () => {
        set({
          plans: INITIAL_SUBSCRIPTION_PLANS,
          subscribers: INITIAL_SUBSCRIBERS,
          manualGrants: INITIAL_MANUAL_GRANTS,
        });
      },
    }),
    {
      name: "richmirabel-admin-subscriptions",
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<SubscriptionStoreState>;
        const rawSubs = state.subscribers ?? [];
        const rawGrants = state.manualGrants ?? [];
        const cleanedSubs = rawSubs.filter((s) => !["sub_01", "sub_02", "sub_03", "sub_04"].includes(s.id) && !s.studentEmail.endsWith("@example.com"));
        const cleanedGrants = rawGrants.filter((g) => g.id !== "grant_01" && !g.studentEmail.endsWith("@example.com"));
        return {
          ...state,
          plans: state.plans && state.plans.length > 0 ? state.plans : INITIAL_SUBSCRIPTION_PLANS,
          subscribers: cleanedSubs,
          manualGrants: cleanedGrants,
        };
      },
    }
  )
);
