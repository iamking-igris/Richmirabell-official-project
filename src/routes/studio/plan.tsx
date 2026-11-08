import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { provider, TERM_PRICE, type PaymentRecord } from "@/lib/payments";
import { trialLeft, useSession } from "@/lib/session";

import { useSubscriptionStore, AVAILABLE_PLAN_FEATURES } from "@/lib/subscription-store";

export const Route = createFileRoute("/studio/plan")({ component: PlanPage });

function PlanPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const subscribed = useSession((s) => s.subscribed);
  const trialStart = useSession((s) => s.trialStart);
  const subscribe = useSession((s) => s.subscribe);
  const addPayment = useSession((s) => s.addPayment);
  const trial = trialLeft(trialStart, subscribed);

  // Read single source of truth from subscription store
  const getActiveMonthlyPlan = useSubscriptionStore((s) => s.getActiveMonthlyPlan);
  const monthlyPlan = getActiveMonthlyPlan();
  const currentPrice = monthlyPlan?.price ?? 4500;

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentRecord["method"]>("Card");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    const result = await provider.checkout({ name, amount: currentPrice, method });
    setBusy(false);
    if (!result.ok) {
      setError("Payment didn't go through. You were not charged. Try again.");
      return;
    }
    // Record payment in student session
    addPayment({ reference: result.reference, name, amount: currentPrice, method, at: Date.now(), status: "Successful" });
    subscribe();

    // Synchronize with subscription store
    const store = useSubscriptionStore.getState();
    const existingSub = store.subscribers.find((s) => s.studentName.toLowerCase() === name.toLowerCase() || s.studentEmail.toLowerCase() === useSession.getState().email.toLowerCase());
    if (existingSub) {
      store.renewSubscriber(existingSub.id, {
        paymentReference: result.reference,
        pricePaid: currentPrice,
        paymentStatus: "Successful",
        durationDays: 30,
        operator: "Student",
      });
    }

    // Synchronize directly with official transaction ledger
    try {
      const { useTransactionStore } = await import("@/lib/transaction-store");
      useTransactionStore.getState().recordTransaction({
        reference: result.reference,
        studentId: existingSub?.studentId || "u_student",
        studentName: name,
        studentEmail: useSession.getState().email,
        studentIdNumber: existingSub?.studentIdNumber,
        planId: monthlyPlan.id,
        planName: monthlyPlan.name,
        amount: currentPrice,
        method,
        status: "Successful",
        subscriptionId: existingSub?.id,
      });
    } catch {
      // safe in isolated test environments
    }

    setReceipt(result.reference);
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl">Plan & Access</h1>
      <p className="mt-2 text-muted">
        {subscribed ? "Monthly access is active." : trial.active ? `${trial.label} of free access.` : "Your free trial has ended. Theory notes remain open. Practice drills and CBT require an active plan."}
      </p>
      <article className="mt-6 rounded-3xl bg-ink p-6 text-primary-fg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-brass">{monthlyPlan.name}</p>
          {monthlyPlan.recommendedLabel && (
            <span className="rounded-full bg-soft/20 px-2.5 py-0.5 text-xs font-semibold text-brass">
              {monthlyPlan.recommendedLabel}
            </span>
          )}
        </div>
        <p className="mt-2 font-display text-5xl">₦{currentPrice.toLocaleString("en-NG")}</p>
        <p className="mt-1 text-sm text-primary-fg/80">{monthlyPlan.durationDays} days access · Renews monthly</p>
        <ul className="mt-4 space-y-2 text-sm">
          {monthlyPlan.features.map((featKey) => {
            const def = AVAILABLE_PLAN_FEATURES.find((f) => f.key === featKey);
            return (
              <li key={featKey} className="flex gap-2">
                <Check className="size-4 shrink-0 text-brass" />
                <span>{def?.label || featKey}</span>
              </li>
            );
          })}
        </ul>
        {!subscribed && (
          <button type="button" onClick={() => setOpen(true)} className="mt-6 w-full rounded-full bg-primary py-3 font-semibold">
            Pay ₦{currentPrice.toLocaleString("en-NG")} / Month
          </button>
        )}
      </article>
      <p className="mt-4 text-sm text-muted">Pay with card, bank transfer or USSD. Questions? hello@richmirabel.com</p>
      {receipt && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <p className="font-display text-2xl">Payment received</p>
          <p className="mt-1 text-sm">Reference {receipt} · ₦{currentPrice.toLocaleString("en-NG")}</p>
          <button type="button" onClick={() => navigate({ to: "/studio" })} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
            Start practising
          </button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6">
            <h2 className="font-display text-3xl">₦{currentPrice.toLocaleString("en-NG")}</h2>
            <p className="mt-1 text-xs text-muted">30-day monthly access renewal</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["Card", "Bank transfer", "USSD"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-xl border px-2 py-3 text-sm ${method === item ? "border-primary bg-soft" : "border-line"}`}>
                  {item}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button type="button" disabled={busy} onClick={pay} className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60">
              {busy ? "Confirming payment…" : `Pay ₦${currentPrice.toLocaleString("en-NG")}`}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-3 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
