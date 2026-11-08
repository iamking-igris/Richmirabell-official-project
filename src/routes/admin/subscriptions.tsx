import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Eye,
  Gift,
  ExternalLink,
  UserX,
  X,
  Check,
  Sparkles,
  Info,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  useSubscriptionStore,
  AVAILABLE_PLAN_FEATURES,
  type SubscriptionPlan,
  type SubscriptionRecord,
  type ManualAccessGrant,
  type SubscriberStatus,
  type PlanFeatureKey,
  calculateDaysRemaining,
  computeSubscriberStatus,
} from "@/lib/subscription-store";
import { useStudentStore } from "@/lib/student-store";
import { seedPayments } from "@/data/seed-admin";
import { naira } from "@/lib/format";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/subscriptions")({ component: MonthlySubscriptionManagementCenter });

export function MonthlySubscriptionManagementCenter() {
  const navigate = useNavigate();
  const plans = useSubscriptionStore((s) => s.plans);
  const subscribers = useSubscriptionStore((s) => s.subscribers);
  const manualGrants = useSubscriptionStore((s) => s.manualGrants);
  const createPlan = useSubscriptionStore((s) => s.createPlan);
  const updatePlan = useSubscriptionStore((s) => s.updatePlan);
  const togglePlanActive = useSubscriptionStore((s) => s.togglePlanActive);
  const deletePlan = useSubscriptionStore((s) => s.deletePlan);
  const extendSubscriberAccess = useSubscriptionStore((s) => s.extendSubscriberAccess);
  const revokeSubscriberAccess = useSubscriptionStore((s) => s.revokeSubscriberAccess);
  const createManualGrant = useSubscriptionStore((s) => s.createManualGrant);
  const extendManualGrant = useSubscriptionStore((s) => s.extendManualGrant);
  const revokeManualGrant = useSubscriptionStore((s) => s.revokeManualGrant);

  // Student store for student selection & profile links
  const students = useStudentStore((s) => s.students);

  // Active Tab: 6 internal sections
  const [activeTab, setActiveTab] = useState<
    "overview" | "plans" | "subscribers" | "activity" | "manual" | "preview"
  >("overview");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function notify(message: string, type: "success" | "error" = "success") {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  }

  // --- Search & Filters for Subscribers Directory ---
  const [subscriberQuery, setSubscriberQuery] = useState("");
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<string>("All");

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const liveStatus = computeSubscriberStatus(sub.status, sub.endDate);
      const matchesStatus =
        subscriberStatusFilter === "All" ||
        (subscriberStatusFilter === "Active" && liveStatus === "Active") ||
        (subscriberStatusFilter === "Trial" && (liveStatus === "Trial" || sub.status === "Trial")) ||
        (subscriberStatusFilter === "Expiring Soon" && liveStatus === "Expiring Soon") ||
        (subscriberStatusFilter === "Expired" && liveStatus === "Expired") ||
        (subscriberStatusFilter === "Cancelled" && sub.status === "Cancelled");

      const q = subscriberQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentEmail.toLowerCase().includes(q) ||
        sub.studentIdNumber.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [subscribers, subscriberQuery, subscriberStatusFilter]);

  // --- Dynamic Core Metrics from actual records ---
  const stats = useMemo(() => {
    let activeSubscribers = 0;
    let trialStudents = 0;
    let expiringSoon = 0;
    let expired = 0;

    subscribers.forEach((sub) => {
      const liveStatus = computeSubscriberStatus(sub.status, sub.endDate);
      if (liveStatus === "Active") activeSubscribers++;
      else if (liveStatus === "Trial" || sub.status === "Trial") trialStudents++;
      else if (liveStatus === "Expiring Soon") expiringSoon++;
      else if (liveStatus === "Expired") expired++;
    });

    const activeManualGrants = manualGrants.filter((g) => g.status === "Active").length;

    return {
      activeSubscribers,
      trialStudents,
      expiringSoon,
      expired,
      activeManualGrants,
    };
  }, [subscribers, manualGrants]);

  // Operational Lists for Monitoring
  const expiringWithin7Days = useMemo(() => {
    return subscribers.filter((sub) => {
      const days = calculateDaysRemaining(sub.endDate);
      return days > 0 && days <= 7 && sub.status !== "Cancelled";
    });
  }, [subscribers]);

  const expiredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const days = calculateDaysRemaining(sub.endDate);
      return days <= 0 && sub.status !== "Cancelled";
    });
  }, [subscribers]);

  // Recently Renewed: derive from actual student-initiated renewal events in subscription history
  const recentlyRenewedList = useMemo(() => {
    const list: Array<{
      studentId: string;
      studentName: string;
      studentIdNumber: string;
      planName: string;
      paymentReference?: string;
      amountPaid: number;
      renewalDate: string;
      newEndDate: string;
    }> = [];

    subscribers.forEach((sub) => {
      const renewalEvents = sub.history.filter((h) => h.type === "renewal_completed");
      renewalEvents.forEach((evt) => {
        list.push({
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentIdNumber: sub.studentIdNumber,
          planName: sub.planName,
          paymentReference: evt.paymentReference || sub.lastPaymentReference,
          amountPaid: evt.priceCharged ?? sub.recordedPrice,
          renewalDate: evt.timestamp,
          newEndDate: sub.endDate,
        });
      });
    });

    return list.sort((a, b) => new Date(b.renewalDate).getTime() - new Date(a.renewalDate).getTime());
  }, [subscribers]);

  // Pending Payments from payment ledger
  const pendingPaymentsList = useMemo(() => {
    const allDemoPayments = seedPayments();
    return allDemoPayments.filter((p) => (p as any).status === "Pending");
  }, []);

  // --- Modals ---
  const [planModalMode, setPlanModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<SubscriptionPlan | null>(null);
  const [planFormName, setPlanFormName] = useState("");
  const [planFormDesc, setPlanFormDesc] = useState("");
  const [planFormPrice, setPlanFormPrice] = useState(4500);
  const [planFormDays, setPlanFormDays] = useState(30);
  const [planFormBilling, setPlanFormBilling] = useState<"Monthly" | "Trial" | "One-off">("Monthly");
  const [planFormFeatures, setPlanFormFeatures] = useState<PlanFeatureKey[]>([]);
  const [planFormRecommended, setPlanFormRecommended] = useState("");
  const [planFormIsActive, setPlanFormIsActive] = useState(true);

  // Subscriber Inspection Modal (Read-only history & audit)
  const [inspectedSubscriber, setInspectedSubscriber] = useState<SubscriptionRecord | null>(null);

  // Extension Modal (Administrator study grant)
  const [extendModalSub, setExtendModalSub] = useState<SubscriptionRecord | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState("Administrative study grant");

  // Revoke Subscription Modal
  const [revokeModalSub, setRevokeModalSub] = useState<SubscriptionRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Manual Grant Modal
  const [openManualGrantModal, setOpenManualGrantModal] = useState(false);
  const [manualGrantStudentId, setManualGrantStudentId] = useState("");
  const [manualGrantDays, setManualGrantDays] = useState(30);
  const [manualGrantReason, setManualGrantReason] = useState("");

  // Revoke Manual Grant Modal
  const [revokeGrantId, setRevokeGrantId] = useState<string | null>(null);
  const [revokeGrantReason, setRevokeGrantReason] = useState("");

  function openCreatePlanModal() {
    setPlanModalMode("create");
    setSelectedPlanForEdit(null);
    setPlanFormName("");
    setPlanFormDesc("");
    setPlanFormPrice(4500);
    setPlanFormDays(30);
    setPlanFormBilling("Monthly");
    setPlanFormFeatures([
      "digitized_notes",
      "subtopic_quizzes",
      "waec_past_questions",
      "weekly_jamb_cbt",
      "full_jamb_mock",
      "progress_performance",
      "learning_guides",
    ]);
    setPlanFormRecommended("");
    setPlanFormIsActive(true);
  }

  function openEditPlanModal(plan: SubscriptionPlan) {
    setPlanModalMode("edit");
    setSelectedPlanForEdit(plan);
    setPlanFormName(plan.name);
    setPlanFormDesc(plan.shortDescription);
    setPlanFormPrice(plan.price);
    setPlanFormDays(plan.durationDays);
    setPlanFormBilling(plan.billingPeriod);
    setPlanFormFeatures([...plan.features]);
    setPlanFormRecommended(plan.recommendedLabel || "");
    setPlanFormIsActive(plan.isActive);
  }

  function handleSavePlan() {
    if (!planFormName.trim()) {
      notify("Plan name is required", "error");
      return;
    }
    if (planFormPrice < 0) {
      notify("Price cannot be negative", "error");
      return;
    }

    if (planModalMode === "create") {
      const res = createPlan({
        name: planFormName.trim(),
        shortDescription: planFormDesc.trim(),
        price: planFormPrice,
        billingPeriod: planFormBilling,
        durationDays: planFormDays,
        features: planFormFeatures,
        isActive: planFormIsActive,
        displayOrder: plans.length + 1,
        recommendedLabel: planFormRecommended.trim() || undefined,
      });
      if (res.success) {
        notify(`Created subscription plan: ${planFormName}`);
        setPlanModalMode(null);
      }
    } else if (planModalMode === "edit" && selectedPlanForEdit) {
      updatePlan(selectedPlanForEdit.id, {
        name: planFormName.trim(),
        shortDescription: planFormDesc.trim(),
        price: planFormPrice,
        billingPeriod: planFormBilling,
        durationDays: planFormDays,
        features: planFormFeatures,
        isActive: planFormIsActive,
        recommendedLabel: planFormRecommended.trim() || undefined,
      });
      notify(`Updated plan: ${planFormName}. Existing subscribers retain their historical terms.`);
      setPlanModalMode(null);
    }
  }

  function toggleFeatureInForm(featKey: PlanFeatureKey) {
    if (planFormFeatures.includes(featKey)) {
      setPlanFormFeatures(planFormFeatures.filter((k) => k !== featKey));
    } else {
      setPlanFormFeatures([...planFormFeatures, featKey]);
    }
  }

  function handleExtendSubscriber() {
    if (!extendModalSub) return;
    extendSubscriberAccess(extendModalSub.id, extendDays, extendReason);
    notify(`Added ${extendDays} days access for ${extendModalSub.studentName}.`);
    setExtendModalSub(null);
  }

  function handleRevokeSubscriber() {
    if (!revokeModalSub) return;
    revokeSubscriberAccess(revokeModalSub.id, revokeReason);
    notify(`Revoked access for ${revokeModalSub.studentName}.`, "error");
    setRevokeModalSub(null);
  }

  function handleCreateManualGrant() {
    if (!manualGrantStudentId) {
      notify("Please select a student", "error");
      return;
    }
    if (!manualGrantReason.trim()) {
      notify("Please provide an internal reason for the grant", "error");
      return;
    }

    const res = createManualGrant({
      studentId: manualGrantStudentId,
      durationDays: manualGrantDays,
      reason: manualGrantReason.trim(),
      grantedBy: "Admin",
    });

    if (res.success) {
      notify(`Manual access grant of ${manualGrantDays} days successfully created.`);
      setOpenManualGrantModal(false);
      setManualGrantStudentId("");
      setManualGrantReason("");
    } else {
      notify(res.error || "Failed to create grant", "error");
    }
  }

  function handleRevokeManualGrant() {
    if (!revokeGrantId) return;
    revokeManualGrant(revokeGrantId, revokeGrantReason || "Administrative revocation");
    notify("Manual grant revoked.", "error");
    setRevokeGrantId(null);
    setRevokeGrantReason("");
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all",
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-red-200 bg-red-50 text-red-900"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="size-4 text-green-600" /> : <AlertTriangle className="size-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-muted hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Administration</span>
            <span>·</span>
            <span>Monthly Subscription Engine</span>
          </div>
          <h1 className="font-display text-4xl text-ink">Subscriptions & Pricing</h1>
          <p className="mt-1 text-sm text-muted">
            Configure monthly subscription products, monitor student renewal activity, review access periods, and manage complimentary grants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenManualGrantModal(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-sm hover:bg-paper"
          >
            <Gift className="size-4 text-muted" />
            <span>Grant Manual Access</span>
          </button>
          <button
            type="button"
            onClick={openCreatePlanModal}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-primary-fg shadow hover:bg-ink/90"
          >
            <Plus className="size-4" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs (6 Sections with corrected Subscription Activity) */}
      <div className="flex border-b border-line overflow-x-auto text-sm font-medium scrollbar-none">
        {[
          { key: "overview", label: "Overview", icon: CreditCard },
          { key: "plans", label: "Plans & Pricing", icon: Sparkles, count: plans.length },
          { key: "subscribers", label: "Subscribers", icon: UserCheck, count: subscribers.length },
          { key: "activity", label: "Subscription Activity", icon: Clock, count: expiringWithin7Days.length + expiredSubscribers.length },
          { key: "manual", label: "Manual Access", icon: Gift, count: manualGrants.length },
          { key: "preview", label: "Student Pricing Preview", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted hover:border-line hover:text-ink"
              )}
            >
              <Icon className={cn("size-4", isActive ? "text-primary" : "text-muted")} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive ? "bg-soft text-primary" : "bg-paper text-muted"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBSCRIPTION OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Core Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Monthly</span>
                <UserCheck className="size-4 text-green-600" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{stats.activeSubscribers}</p>
              <p className="mt-1 text-xs text-muted">Paid monthly subscribers</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Trial Students</span>
                <Clock className="size-4 text-blue-600" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{stats.trialStudents}</p>
              <p className="mt-1 text-xs text-muted">48-hr evaluation access</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{stats.expiringSoon}</p>
              <p className="mt-1 text-xs text-muted">Within next 7 days</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Expired</span>
                <UserX className="size-4 text-red-500" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{stats.expired}</p>
              <p className="mt-1 text-xs text-muted">Awaiting candidate renewal</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Manual Grants</span>
                <Gift className="size-4 text-purple-600" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{stats.activeManualGrants}</p>
              <p className="mt-1 text-xs text-muted">Complimentary grants</p>
            </div>
          </div>

          {/* Operational Monitoring Attention Section (Read-only observation & student link) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attention: Expiring within 7 days */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-ink">Upcoming Expirations (7 Days)</h3>
                  <p className="text-xs text-muted">Students approaching renewal deadline</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {expiringWithin7Days.length} Due Soon
                </span>
              </div>

              <div className="mt-4 divide-y divide-line">
                {expiringWithin7Days.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No subscriptions expiring within the next 7 days.</p>
                ) : (
                  expiringWithin7Days.map((sub) => {
                    const days = calculateDaysRemaining(sub.endDate);
                    return (
                      <div key={sub.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{sub.studentName}</p>
                          <p className="text-xs text-muted">
                            {sub.studentIdNumber} · Expires {new Date(sub.endDate).toLocaleDateString("en-NG")} ({days}d left)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to="/admin/students"
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft"
                          >
                            <span>View Student</span>
                            <ArrowUpRight className="size-3 text-muted" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setInspectedSubscriber(sub)}
                            className="rounded-lg border border-line p-1.5 text-muted hover:text-ink"
                            title="Audit history"
                          >
                            <Eye className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Expired Subscriptions */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-ink">Expired Subscriptions</h3>
                  <p className="text-xs text-muted">Accounts remain active; practice features await student renewal.</p>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                  {expiredSubscribers.length} Expired
                </span>
              </div>

              <div className="mt-4 divide-y divide-line">
                {expiredSubscribers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No expired subscriptions.</p>
                ) : (
                  expiredSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{sub.studentName}</p>
                        <p className="text-xs text-muted">
                          {sub.studentIdNumber} · Lapsed {new Date(sub.endDate).toLocaleDateString("en-NG")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/students"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft"
                        >
                          <span>View Student</span>
                          <ArrowUpRight className="size-3 text-muted" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setInspectedSubscriber(sub)}
                          className="rounded-lg border border-line p-1.5 text-muted hover:text-ink"
                          title="Audit history"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Business Rule Banner */}
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h4 className="flex items-center gap-2 font-display text-base text-ink">
              <ShieldCheck className="size-4 text-primary" />
              <span>Student-Initiated Renewal & Admin Governance Rules</span>
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-4 text-xs text-muted sm:grid-cols-3">
              <div>
                <p className="font-semibold text-ink">1. Student-Owned Renewals</p>
                <p className="mt-1">
                  Students initiate and complete their own monthly renewals from their account. Administrators observe activity but never trigger paid renewals.
                </p>
              </div>
              <div>
                <p className="font-semibold text-ink">2. Zero Payment Generation</p>
                <p className="mt-1">
                  Managing or observing expired subscriptions never creates transactions. Financial records exist only in Payments & Revenue.
                </p>
              </div>
              <div>
                <p className="font-semibold text-ink">3. Pure Complimentary Access</p>
                <p className="mt-1">
                  Complimentary scholarship grants are recorded under Manual Access with audit justifications, strictly separated from paid subscription revenue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PLANS & PRICING TAB */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-ink">Subscription Plans</h2>
              <p className="text-sm text-muted">
                Active plans visible to candidates on the student-facing pricing screen.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreatePlanModal}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-ink/90"
            >
              <Plus className="size-4" />
              <span>Add Custom Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-3xl border p-6 transition-all",
                  plan.isActive ? "border-line bg-surface shadow-sm" : "border-line/60 bg-paper/60 opacity-80"
                )}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                          {plan.billingPeriod} Plan
                        </span>
                        {plan.recommendedLabel && (
                          <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {plan.recommendedLabel}
                          </span>
                        )}
                        {!plan.isActive && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-2xl text-ink">{plan.name}</h3>
                      <p className="mt-1 text-sm text-muted">{plan.shortDescription}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-y border-line py-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl text-ink">{naira(plan.price)}</span>
                      <span className="text-sm text-muted">
                        / {plan.durationDays} days ({plan.billingPeriod.toLowerCase()})
                      </span>
                    </div>
                  </div>

                  {/* Included features */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Included Learning Modules</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {AVAILABLE_PLAN_FEATURES.map((feat) => {
                        const isIncluded = plan.features.includes(feat.key);
                        return (
                          <li
                            key={feat.key}
                            className={cn("flex items-center gap-2", isIncluded ? "text-ink" : "text-muted/60 line-through")}
                          >
                            {isIncluded ? (
                              <Check className="size-4 shrink-0 text-primary" />
                            ) : (
                              <X className="size-4 shrink-0 text-muted/40" />
                            )}
                            <span className="text-xs">{feat.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlanActive(plan.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        plan.isActive
                          ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "bg-green-50 text-green-800 hover:bg-green-100"
                      )}
                    >
                      {plan.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditPlanModal(plan)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-soft"
                    >
                      <Edit2 className="size-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {plan.id !== "plan_free_trial" && plan.id !== "plan_monthly_access" && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = deletePlan(plan.id);
                        if (!res.success) notify(res.error || "Could not delete plan", "error");
                        else notify(`Deleted plan ${plan.name}`);
                      }}
                      className="p-1.5 text-muted hover:text-red-600"
                      title="Delete Plan"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBSCRIBERS DIRECTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-ink">Subscribers Directory</h2>
              <p className="text-sm text-muted">
                Track candidate subscription periods, recorded monthly prices, and access validity.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={subscriberQuery}
                onChange={(e) => setSubscriberQuery(e.target.value)}
                placeholder="Search subscriber name, email, or student ID..."
                className="min-h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={subscriberStatusFilter}
              onChange={(e) => setSubscriberStatusFilter(e.target.value)}
              className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="All">All Statuses ({subscribers.length})</option>
              <option value="Active">Active Paid</option>
              <option value="Trial">Free Trial</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Subscribers Table (Read-only administrative inspection; no renew buttons) */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/50 text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Recorded Price</th>
                  <th className="px-3 py-3">Start Date</th>
                  <th className="px-3 py-3">Period End</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                      No matching subscribers found.
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((sub) => {
                    const liveStatus = computeSubscriberStatus(sub.status, sub.endDate);
                    const days = calculateDaysRemaining(sub.endDate);

                    return (
                      <tr key={sub.id} className="hover:bg-paper/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{sub.studentName}</p>
                          <p className="text-xs text-muted">{sub.studentEmail}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted">{sub.studentIdNumber}</td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-ink">{sub.planName}</span>
                          {sub.renewalCount > 0 && (
                            <span className="block text-xs text-muted">Cycle {sub.renewalCount + 1}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-ink">
                          {sub.recordedPrice === 0 ? "₦0 (Trial)" : naira(sub.recordedPrice)}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted">
                          {new Date(sub.startDate).toLocaleDateString("en-NG")}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <p className="font-medium text-ink">{new Date(sub.endDate).toLocaleDateString("en-NG")}</p>
                          <p className="text-[11px] text-muted">
                            {days > 0 ? `${days} days left` : "Expired"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              liveStatus === "Active" && "bg-green-50 text-green-800",
                              liveStatus === "Trial" && "bg-blue-50 text-blue-800",
                              liveStatus === "Expiring Soon" && "bg-amber-50 text-amber-800",
                              liveStatus === "Expired" && "bg-red-50 text-red-800",
                              liveStatus === "Cancelled" && "bg-gray-100 text-gray-800"
                            )}
                          >
                            {liveStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectedSubscriber(sub)}
                              className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                              title="Audit History & Details"
                            >
                              Details
                            </button>
                            <Link
                              to="/admin/students"
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                            >
                              <span>Profile</span>
                              <ArrowUpRight className="size-3 text-muted" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBSCRIPTION ACTIVITY TAB (Monitoring Only - No Admin Renew Actions) */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl text-ink">Subscription Activity</h2>
            <p className="text-sm text-muted">
              Monitoring console for candidate renewals, expiring access periods, and transaction statuses.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Section A: Expiring Soon */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-600" />
                  <h3 className="font-display text-lg text-ink">Expiring Soon (Within 7 Days)</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {expiringWithin7Days.length}
                </span>
              </div>

              <div className="mt-3 divide-y divide-line">
                {expiringWithin7Days.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No students currently expiring within the next 7 days.</p>
                ) : (
                  expiringWithin7Days.map((sub) => {
                    const days = calculateDaysRemaining(sub.endDate);
                    return (
                      <div key={sub.id} className="flex items-center justify-between py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink">{sub.studentName}</p>
                            <span className="font-mono text-xs text-muted">({sub.studentIdNumber})</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            Plan: <span className="text-ink font-medium">{sub.planName}</span> · Expiry: {new Date(sub.endDate).toLocaleDateString("en-NG")} ({days} days remaining)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            Expiring Soon
                          </span>
                          <Link
                            to="/admin/students"
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                          >
                            <span>View Student</span>
                            <ArrowUpRight className="size-3 text-muted" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Section B: Expired Subscriptions */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <UserX className="size-4 text-red-600" />
                  <h3 className="font-display text-lg text-ink">Expired Subscriptions</h3>
                </div>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                  {expiredSubscribers.length}
                </span>
              </div>

              <div className="mt-3 divide-y divide-line">
                {expiredSubscribers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No expired candidate subscriptions.</p>
                ) : (
                  expiredSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink">{sub.studentName}</p>
                          <span className="font-mono text-xs text-muted">({sub.studentIdNumber})</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Previous Plan: <span className="text-ink font-medium">{sub.planName}</span> · Expiry: {new Date(sub.endDate).toLocaleDateString("en-NG")}
                        </p>
                        <p className="text-[11px] text-muted">Account remains active. Awaiting student-initiated renewal.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Expired
                        </span>
                        <Link
                          to="/admin/students"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                        >
                          <span>View Student</span>
                          <ArrowUpRight className="size-3 text-muted" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section C: Recently Renewed (Student-Initiated Read-Only History) */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                <h3 className="font-display text-lg text-ink">Recently Renewed (Student-Initiated)</h3>
              </div>
              <span className="text-xs text-muted">Read-Only Administrative Audit</span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-paper/50 text-[11px] font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Payment Reference</th>
                    <th className="px-3 py-2">Amount Paid</th>
                    <th className="px-3 py-2">Renewal Date</th>
                    <th className="px-3 py-2">New Expiry Date</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentlyRenewedList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted">
                        No renewal events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentlyRenewedList.map((item, idx) => (
                      <tr key={`${item.studentId}_${idx}`} className="hover:bg-paper/30">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-ink">{item.studentName}</p>
                          <p className="text-[11px] font-mono text-muted">{item.studentIdNumber}</p>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-ink">{item.planName}</td>
                        <td className="px-3 py-2.5 font-mono text-primary font-medium">{item.paymentReference || "—"}</td>
                        <td className="px-3 py-2.5 font-semibold text-ink">{naira(item.amountPaid)}</td>
                        <td className="px-3 py-2.5 text-muted">
                          {new Date(item.renewalDate).toLocaleDateString("en-NG")}
                        </td>
                        <td className="px-3 py-2.5 text-ink font-medium">
                          {new Date(item.newEndDate).toLocaleDateString("en-NG")}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            to="/admin/payments"
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-[11px] font-medium text-ink hover:bg-soft"
                          >
                            <span>Receipt</span>
                            <ArrowUpRight className="size-3 text-muted" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: Pending Payments (Only rendered if demo model contains pending payments) */}
          {pendingPaymentsList.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-600" />
                  <h3 className="font-display text-lg text-ink">Pending Payment Confirmations</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {pendingPaymentsList.length} Pending
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                <strong>Enforcement Rule:</strong> Pending transactions do not extend or activate paid access periods until verified successful.
              </p>

              <div className="mt-3 divide-y divide-line">
                {pendingPaymentsList.map((payment) => (
                  <div key={payment.reference} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <p className="font-semibold text-ink">{payment.name}</p>
                      <p className="text-muted">
                        Reference: <span className="font-mono text-primary">{payment.reference}</span> · Method: {payment.method} · Amount: {naira(payment.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Pending Verification
                      </span>
                      <Link
                        to="/admin/payments"
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                      >
                        <span>View Payments</span>
                        <ArrowUpRight className="size-3 text-muted" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MANUAL ACCESS GRANTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "manual" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-ink">Complimentary & Manual Access Grants</h2>
              <p className="text-sm text-muted">
                Admin-authorized complimentary access for scholarships, institutional partnerships, and academic testing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenManualGrantModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-ink/90"
            >
              <Plus className="size-4" />
              <span>Grant New Access</span>
            </button>
          </div>

          <div className="rounded-xl border border-line bg-paper p-4 text-xs text-muted">
            <p className="font-semibold text-ink">Important Governance Safeguards:</p>
            <p className="mt-1">
              Manual grants do NOT create payment records, do not increase revenue in Payments & Revenue, and are strictly audited with internal justifications.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/50 text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-3 py-3">Student ID</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Granted Date</th>
                  <th className="px-3 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Internal Justification</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {manualGrants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                      No manual access grants recorded.
                    </td>
                  </tr>
                ) : (
                  manualGrants.map((grant) => (
                    <tr key={grant.id} className="hover:bg-paper/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{grant.studentName}</p>
                        <p className="text-xs text-muted">{grant.studentEmail}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted">{grant.studentIdNumber}</td>
                      <td className="px-3 py-3 font-medium text-ink">{grant.durationDays} Days</td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {new Date(grant.startDate).toLocaleDateString("en-NG")}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {new Date(grant.endDate).toLocaleDateString("en-NG")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted max-w-xs truncate" title={grant.reason}>
                        {grant.reason}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            grant.status === "Active"
                              ? "bg-purple-50 text-purple-800"
                              : grant.status === "Revoked"
                              ? "bg-red-50 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {grant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {grant.status === "Active" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                extendManualGrant(grant.id, 14);
                                notify(`Extended grant by 14 days for ${grant.studentName}`);
                              }}
                              className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-soft"
                            >
                              +14d
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRevokeGrantId(grant.id);
                                setRevokeGrantReason("");
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STUDENT PRICING PREVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-ink">Student-Facing Pricing Experience</h2>
              <p className="text-sm text-muted">
                Live preview of active plans rendered with student application typography and benefits layout.
              </p>
            </div>
            <Link
              to="/studio/plan"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              <span>Open Student Plan Page</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-line bg-paper p-8">
            <div className="mx-auto max-w-4xl">
              <div className="text-center">
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-primary">
                  Select Your Examination Preparation Plan
                </span>
                <h3 className="mt-3 font-display text-3xl text-ink">Affordable Monthly Learning for UTME & WAEC</h3>
                <p className="mt-2 text-sm text-muted max-w-xl mx-auto">
                  Master every topic until it cannot surprise you. Renews monthly with full flexibility and no lock-in.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-2xl mx-auto">
                {plans
                  .filter((p) => p.isActive)
                  .map((plan) => {
                    const isMonthly = plan.billingPeriod === "Monthly";

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "relative flex flex-col justify-between rounded-3xl p-6 transition-all",
                          isMonthly
                            ? "bg-ink text-primary-fg shadow-xl ring-2 ring-primary"
                            : "border border-line bg-surface text-ink"
                        )}
                      >
                        {plan.recommendedLabel && (
                          <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-fg shadow">
                            {plan.recommendedLabel}
                          </div>
                        )}

                        <div>
                          <p className={cn("text-xs font-semibold uppercase tracking-wider", isMonthly ? "text-brass" : "text-muted")}>
                            {plan.name}
                          </p>
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="font-display text-4xl">{plan.price === 0 ? "Free" : naira(plan.price)}</span>
                            <span className={cn("text-xs", isMonthly ? "text-primary-fg/80" : "text-muted")}>
                              {plan.price === 0 ? "· 2 days" : "/ month (30 days)"}
                            </span>
                          </div>
                          <p className={cn("mt-2 text-xs", isMonthly ? "text-primary-fg/80" : "text-muted")}>
                            {plan.shortDescription}
                          </p>

                          <div className="mt-6 border-t border-line/20 pt-4">
                            <p className={cn("text-xs font-semibold uppercase tracking-wider", isMonthly ? "text-brass" : "text-muted")}>
                              What is included:
                            </p>
                            <ul className="mt-3 space-y-2.5 text-xs">
                              {plan.features.map((featKey) => {
                                const def = AVAILABLE_PLAN_FEATURES.find((f) => f.key === featKey);
                                return (
                                  <li key={featKey} className="flex items-center gap-2">
                                    <Check className={cn("size-4 shrink-0", isMonthly ? "text-brass" : "text-primary")} />
                                    <span>{def?.label || featKey}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-8">
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-full py-3 text-sm font-semibold transition-colors",
                              isMonthly
                                ? "bg-primary text-primary-fg hover:bg-primary/90"
                                : "bg-ink text-primary-fg hover:bg-ink/90"
                            )}
                          >
                            {plan.price === 0 ? "Start 2-Day Free Trial" : `Pay ${naira(plan.price)} / Month`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <p className="mt-6 text-center text-xs text-muted">
                Nigerian cards, direct bank transfer and USSD supported. No automatic card charging.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Plan Create/Edit Modal */}
      {planModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-xl text-ink">
                {planModalMode === "create" ? "Create New Subscription Plan" : `Edit Plan: ${selectedPlanForEdit?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalMode(null)}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Plan Name</label>
                <input
                  type="text"
                  value={planFormName}
                  onChange={(e) => setPlanFormName(e.target.value)}
                  placeholder="e.g. Monthly Access"
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Short Description</label>
                <input
                  type="text"
                  value={planFormDesc}
                  onChange={(e) => setPlanFormDesc(e.target.value)}
                  placeholder="Brief summary for candidates"
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Price in NGN (₦)</label>
                  <input
                    type="number"
                    value={planFormPrice}
                    onChange={(e) => setPlanFormPrice(Number(e.target.value))}
                    min={0}
                    step={100}
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Duration (Days)</label>
                  <input
                    type="number"
                    value={planFormDays}
                    onChange={(e) => setPlanFormDays(Number(e.target.value))}
                    min={1}
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Billing Period</label>
                  <select
                    value={planFormBilling}
                    onChange={(e) => setPlanFormBilling(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Trial">Trial</option>
                    <option value="One-off">One-off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Recommended Label</label>
                  <input
                    type="text"
                    value={planFormRecommended}
                    onChange={(e) => setPlanFormRecommended(e.target.value)}
                    placeholder="e.g. Recommended for UTME"
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Included Features</label>
                <div className="mt-2 space-y-2 rounded-xl border border-line bg-paper p-3">
                  {AVAILABLE_PLAN_FEATURES.map((feat) => {
                    const checked = planFormFeatures.includes(feat.key);
                    return (
                      <label key={feat.key} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeatureInForm(feat.key)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="font-medium">{feat.label}</span>
                        <span className="text-muted truncate">({feat.description})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planFormActiveCheck"
                  checked={planFormIsActive}
                  onChange={(e) => setPlanFormIsActive(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="planFormActiveCheck" className="text-xs font-medium text-ink cursor-pointer">
                  Activate this plan immediately for student selection
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setPlanModalMode(null)}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-ink/90"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Subscriber History & Details Modal (Read-only administrative history) */}
      {inspectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Subscriber Record</span>
                <h3 className="font-display text-xl text-ink">{inspectedSubscriber.studentName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSubscriber(null)}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Student ID</p>
                  <p className="mt-1 font-mono font-semibold text-ink">{inspectedSubscriber.studentIdNumber}</p>
                </div>
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Current Plan</p>
                  <p className="mt-1 font-semibold text-ink">{inspectedSubscriber.planName}</p>
                </div>
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Recorded Purchase Price</p>
                  <p className="mt-1 font-semibold text-ink">{naira(inspectedSubscriber.recordedPrice)}</p>
                </div>
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Access Period Ends</p>
                  <p className="mt-1 font-semibold text-ink">
                    {new Date(inspectedSubscriber.endDate).toLocaleDateString("en-NG")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-display text-sm text-ink">Audit & Subscription Lifecycle History</h4>
                <div className="mt-2 space-y-2">
                  {inspectedSubscriber.history.map((evt) => (
                    <div key={evt.id} className="rounded-xl border border-line bg-paper/60 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{evt.title}</span>
                        <span className="text-[11px] text-muted">
                          {new Date(evt.timestamp).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                        </span>
                      </div>
                      <p className="mt-1 text-muted">{evt.description}</p>
                      {evt.paymentReference && (
                        <p className="mt-1 font-mono text-[11px] text-primary">Ref: {evt.paymentReference}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <button
                type="button"
                onClick={() => {
                  setRevokeModalSub(inspectedSubscriber);
                  setInspectedSubscriber(null);
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Revoke Access
              </button>
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/students"
                  className="rounded-xl bg-ink px-3.5 py-2 text-xs font-semibold text-primary-fg hover:bg-ink/90"
                >
                  View Student Profile
                </Link>
                <button
                  type="button"
                  onClick={() => setInspectedSubscriber(null)}
                  className="rounded-xl border border-line px-3.5 py-2 text-xs font-medium text-muted hover:text-ink"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Revoke Subscription Modal */}
      {revokeModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-xl text-red-600">Revoke Subscription Access</h3>
            <p className="mt-1 text-xs text-muted">
              Are you sure you want to revoke access for <strong>{revokeModalSub.studentName}</strong>?
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Reason for Revocation</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Required explanation for audit records..."
                className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink focus:border-primary focus:outline-none"
                rows={3}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setRevokeModalSub(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeSubscriber}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Manual Grant Creation Modal */}
      {openManualGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-xl text-ink">Grant Manual Access</h3>
              <button
                type="button"
                onClick={() => setOpenManualGrantModal(false)}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Select Student</label>
                <select
                  value={manualGrantStudentId}
                  onChange={(e) => setManualGrantStudentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                >
                  <option value="">-- Choose Candidate --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.studentIdNumber}) · Current: {st.accessPlan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Grant Duration</label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setManualGrantDays(d)}
                      className={cn(
                        "rounded-xl border py-2 text-xs font-semibold",
                        manualGrantDays === d ? "border-primary bg-soft text-primary" : "border-line text-muted"
                      )}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Internal Justification</label>
                <textarea
                  value={manualGrantReason}
                  onChange={(e) => setManualGrantReason(e.target.value)}
                  placeholder="e.g. Merit scholarship or institutional partner grant..."
                  className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink focus:border-primary focus:outline-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setOpenManualGrantModal(false)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManualGrant}
                className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-ink/90"
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Revoke Manual Grant Modal */}
      {revokeGrantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-xl text-red-600">Revoke Manual Grant</h3>
            <p className="mt-1 text-xs text-muted">Candidate access will immediately revert to expired.</p>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Reason</label>
              <textarea
                value={revokeGrantReason}
                onChange={(e) => setRevokeGrantReason(e.target.value)}
                placeholder="Reason for audit log..."
                className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink focus:border-primary focus:outline-none"
                rows={2}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setRevokeGrantId(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeManualGrant}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Revoke Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
