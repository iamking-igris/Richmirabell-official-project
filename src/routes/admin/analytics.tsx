import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import {
  adminApi,
  type AdminOverview,
  type AdminPlan,
  type AdminStudent,
  type AdminSubscription,
  type AdminTransaction,
} from "@/lib/backend";
import { useAdminQuery } from "@/lib/admin-query";
import { formatNaira, statusLabel } from "@/lib/admin-format";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminStat,
} from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalyticsPage });

interface AnalyticsData {
  overview: AdminOverview;
  transactions: AdminTransaction[];
  subscriptions: AdminSubscription[];
  students: AdminStudent[];
  plans: AdminPlan[];
}

export function AdminAnalyticsPage() {
  const { data, loading, error, errorStatus, reload } = useAdminQuery<AnalyticsData>(async () => {
    const [overview, transactions, subscriptions, students, plans] = await Promise.all([
      adminApi.overview(),
      adminApi.transactions(),
      adminApi.subscriptions(),
      adminApi.students(),
      adminApi.plans(),
    ]);
    return { overview, transactions, subscriptions, students, plans };
  });

  const overview = data?.overview;
  const transactions = data?.transactions ?? [];
  const subscriptions = data?.subscriptions ?? [];
  const students = data?.students ?? [];
  const plans = data?.plans ?? [];

  const metrics = useMemo(() => {
    let successfulRevenue = 0;
    let successfulCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    for (const transaction of transactions) {
      const status = transaction.status.toUpperCase();
      if (status === "SUCCESS" || status === "SUCCESSFUL") {
        successfulRevenue += transaction.amount;
        successfulCount += 1;
      } else if (status === "PENDING") {
        pendingAmount += transaction.amount;
        pendingCount += 1;
      } else if (status === "FAILED") {
        failedCount += 1;
      }
    }

    const subscriptionStatus = new Map<string, number>();
    for (const subscription of subscriptions) {
      const key = subscription.status.toUpperCase();
      subscriptionStatus.set(key, (subscriptionStatus.get(key) ?? 0) + 1);
    }

    const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
    const planMix = new Map<string, number>();
    for (const subscription of subscriptions) {
      const key = planNames.get(subscription.planId) ?? subscription.planId;
      planMix.set(key, (planMix.get(key) ?? 0) + 1);
    }

    const examMix = new Map<string, number>();
    for (const student of students) {
      for (const exam of student.exams ?? []) {
        const key = exam.toUpperCase();
        examMix.set(key, (examMix.get(key) ?? 0) + 1);
      }
    }

    const withAccess = students.filter((student) => student.hasAccess).length;
    const onboarded = students.filter((student) => student.onboardingComplete).length;

    return {
      successfulRevenue,
      successfulCount,
      pendingAmount,
      pendingCount,
      failedCount,
      subscriptionStatus: Array.from(subscriptionStatus.entries()).sort((a, b) => b[1] - a[1]),
      planMix: Array.from(planMix.entries()).sort((a, b) => b[1] - a[1]),
      examMix: Array.from(examMix.entries()).sort((a, b) => b[1] - a[1]),
      withAccess,
      onboarded,
      onboardingRate: students.length > 0 ? Math.round((onboarded / students.length) * 100) : 0,
    };
  }, [transactions, subscriptions, students, plans]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Aggregates computed only from live backend records. No sample or estimated data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </header>

      {loading && <AdminLoading label="Loading analytics…" />}
      {!loading && error && (
        <AdminError message={error} status={errorStatus} onRetry={() => void reload()} />
      )}

      {!loading && !error && overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat label="Total students" value={overview.totalStudents} />
            <AdminStat label="Active subscriptions" value={overview.activeSubscriptions} />
            <AdminStat label="Total revenue" value={formatNaira(overview.totalRevenue)} />
            <AdminStat label="Pending payments" value={overview.pendingPayments} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat label="Newly registered" value={overview.newlyRegistered} />
            <AdminStat
              label="Students with access"
              value={metrics.withAccess}
              hint={`${metrics.onboarded} onboarding complete (${metrics.onboardingRate}%)`}
            />
            <AdminStat label="Pending reviews" value={overview.pendingReviews} />
            <AdminStat
              label="Draft content"
              value={overview.draftTopics}
              hint={`${overview.draftTopics} topics awaiting publication`}
            />
          </div>

          <AdminPanel
            title="Revenue from transactions"
            description="Successful, pending, and failed payment records."
          >
            {transactions.length === 0 ? (
              <div className="p-4">
                <AdminEmpty
                  title="No transactions yet"
                  description="Revenue metrics will appear after the first payment is recorded."
                />
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <AdminStat
                  label="Successful revenue"
                  value={formatNaira(metrics.successfulRevenue)}
                  hint={`${metrics.successfulCount} successful`}
                />
                <AdminStat
                  label="Pending amount"
                  value={formatNaira(metrics.pendingAmount)}
                  hint={`${metrics.pendingCount} pending`}
                />
                <AdminStat
                  label="Failed payments"
                  value={metrics.failedCount}
                  hint={`${transactions.length} total transactions`}
                />
              </div>
            )}
          </AdminPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Subscription status" description="Counts by backend status.">
              {subscriptions.length === 0 ? (
                <div className="p-4">
                  <AdminEmpty title="No subscriptions yet" />
                </div>
              ) : (
                <div className="p-4">
                  <DistributionBars
                    items={metrics.subscriptionStatus.map(([status, count]) => ({
                      label: statusLabel(status),
                      count,
                    }))}
                  />
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Plan mix" description="Subscriptions grouped by plan.">
              {subscriptions.length === 0 ? (
                <div className="p-4">
                  <AdminEmpty title="No plan usage yet" />
                </div>
              ) : (
                <div className="p-4">
                  <DistributionBars
                    items={metrics.planMix.map(([label, count]) => ({ label, count }))}
                  />
                </div>
              )}
            </AdminPanel>
          </div>

          <AdminPanel title="Exam interest" description="Students grouped by selected exam.">
            {students.length === 0 ? (
              <div className="p-4">
                <AdminEmpty
                  title="No student data yet"
                  description="Exam distribution appears after students complete onboarding."
                />
              </div>
            ) : metrics.examMix.length === 0 ? (
              <div className="p-4">
                <AdminEmpty
                  title="No exams selected yet"
                  description="Students have registered but have not selected an exam."
                />
              </div>
            ) : (
              <div className="p-4">
                <DistributionBars
                  items={metrics.examMix.map(([label, count]) => ({ label, count }))}
                />
              </div>
            )}
          </AdminPanel>

          {overview.totalStudents === 0 && transactions.length === 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                The platform is currently empty. Analytics will populate as students register,
                subscribe, and make payments.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DistributionBars({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 font-semibold text-muted">{item.count}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-soft">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
