import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { billingApi, type Plan } from "@/lib/backend";
import { trialLeft, useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/studio/plan")({ component: PlanPage });

function PlanPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const email = useSession((s) => s.email);
  const subscribed = useSession((s) => s.subscribed);
  const trialStart = useSession((s) => s.trialStart);
  const refreshAccess = useSession((s) => s.refreshAccess);
  const refreshProfile = useSession((s) => s.refreshProfile);
  const trial = trialLeft(trialStart, subscribed);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; planName: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [plansList, access] = await Promise.all([billingApi.plans(), billingApi.access()]);
      setPlans(plansList);
      setActivePlan(access?.subscription ? plansList.find((p) => p.id === access.subscription?.plan_id) ?? null : null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function initiatePayment(planId: string) {
    setBusy(true);
    setError("");
    try {
      const result = await billingApi.initPayment(planId);
      if (!result.configured) {
        setError(
          "Paystack is not configured on the backend. Contact support to enable card payments.",
        );
        return;
      }
      if (!result.authorization_url) {
        setError(result.message || "Paystack did not return a checkout link.");
        return;
      }
      // Open Paystack checkout in a new tab so the customer can authorize payment.
      const win = window.open(result.authorization_url, "_blank", "noopener,noreferrer");
      if (!win) {
        setError("Your browser blocked the payment window. Please allow pop-ups for this site.");
        return;
      }
      setReceipt({ reference: result.reference, amount: result.amount, planName: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!receipt) return;
    setVerifying(true);
    setError("");
    try {
      const result = await billingApi.verifyPayment(receipt.reference);
      if (result.status === "SUCCESS" || result.status === "success") {
        setConfirmed(true);
        await refreshAccess();
        await refreshProfile();
        setReceipt({ ...receipt, planName: activePlan?.name ?? receipt.planName });
      } else if (!result.configured) {
        setError("Paystack is not configured on the backend.");
      } else {
        setError(result.message || "Payment did not succeed. You were not charged.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify payment.");
    } finally {
      setVerifying(false);
    }
  }

  const monthlyPlan = plans.find((p) => p.id === "plan_monthly_access") || activePlan || plans[0] || null;

  if (loading) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-4xl">Loading access plans…</h1>
      </div>
    );
  }

  if (!monthlyPlan) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-4xl">No access plan is available.</h1>
        <p className="mt-2 text-sm text-muted">{error || "The backend has no active plans."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl">Plan & Access</h1>
      <p className="mt-2 text-muted">
        {subscribed
          ? "Monthly access is active."
          : trial.active
            ? `${trial.label} of free trial left.`
            : "Your free trial has ended. Notes remain open; practice and CBT require an active plan."}
      </p>
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

      <article className="mt-6 rounded-3xl bg-ink p-6 text-primary-fg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-brass">
            {monthlyPlan.name}
          </p>
        </div>
        <p className="mt-2 font-display text-5xl">{naira(monthlyPlan.price)}</p>
        <p className="mt-1 text-sm text-primary-fg/80">
          {monthlyPlan.duration_days} days access · Renews monthly
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {(monthlyPlan.active
            ? ["JAMB · WAEC syllabus notes", "Topic quizzes with server scoring", "Timed JAMB CBT", "Past papers and progress tracking"]
            : ["Contact support to reactivate this plan"]).map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check className="size-4 shrink-0 text-brass" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {!subscribed && monthlyPlan.active && (
          <button
            type="button"
            disabled={busy}
            onClick={() => initiatePayment(monthlyPlan.id)}
            className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60"
          >
            {busy ? "Opening payment…" : `Pay ${naira(monthlyPlan.price)} / Month`}
          </button>
        )}
        {subscribed && (
          <p className="mt-6 text-sm text-primary-fg/80">
            Active plan: <strong>{monthlyPlan.name}</strong>.
          </p>
        )}
      </article>

      <p className="mt-4 text-sm text-muted">
        Pay with card, bank transfer or USSD via Paystack. Questions? hello@richmirabel.com
      </p>

      {receipt && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          {confirmed ? (
            <>
              <p className="font-display text-2xl text-emerald-700">Payment confirmed</p>
              <p className="mt-1 text-sm">
                Reference {receipt.reference} · {naira(receipt.amount)} ·{" "}
                {receipt.planName || activePlan?.name || ""}
              </p>
              <p className="mt-2 text-sm text-muted">
                Access has been activated on your account. A payment confirmation is sent to your email when delivery is configured.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/studio" })}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
              >
                Start practising
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-2xl">Payment awaiting verification</p>
              <p className="mt-1 text-sm">
                Reference {receipt.reference} · {naira(receipt.amount)} ·{" "}
                {receipt.planName || activePlan?.name || ""}
              </p>
              {verifying ? (
                <p className="mt-3 text-sm text-muted">Verifying with Paystack…</p>
              ) : (
                <button
                  type="button"
                  disabled={verifying}
                  onClick={verify}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
                >
                  {verifying ? "Verifying…" : "I completed payment — verify access"}
                </button>
              )}
              <p className="mt-2 text-sm text-muted">
                Paystack checkout opened in a new window. After you pay, return here and verify so the backend can confirm the transaction.
              </p>
              <p className="mt-2 text-sm text-muted">
                A payment confirmation is sent to your email when delivery is configured. Do not refresh or close this page before verifying.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
