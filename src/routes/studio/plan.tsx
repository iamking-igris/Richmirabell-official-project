import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { provider, TERM_PRICE, type PaymentRecord } from "@/lib/payments";
import { trialLeft, useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/plan")({ component: PlanPage });

function PlanPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const subscribed = useSession((s) => s.subscribed);
  const trialStart = useSession((s) => s.trialStart);
  const subscribe = useSession((s) => s.subscribe);
  const addPayment = useSession((s) => s.addPayment);
  const trial = trialLeft(trialStart, subscribed);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentRecord["method"]>("Card");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    const result = await provider.checkout({ name, amount: TERM_PRICE, method });
    setBusy(false);
    if (!result.ok) {
      setError("Payment didn't go through. You were not charged. Try again.");
      return;
    }
    addPayment({ reference: result.reference, name, amount: TERM_PRICE, method, at: Date.now(), status: "Successful" });
    subscribe();
    setReceipt(result.reference);
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-4xl">Plan</h1>
      <p className="mt-2 text-muted">
        {subscribed ? "Term access is active." : trial.active ? `${trial.label} of free access.` : "Your free days are over. Notes stay open. Practice needs a plan."}
      </p>
      <article className="mt-6 rounded-3xl bg-ink p-6 text-primary-fg">
        <p className="text-sm text-brass">Term access</p>
        <p className="mt-2 font-display text-5xl">₦4,500</p>
        <p className="mt-1 text-sm">One term, every topic, every set.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {["All subjects", "All practice sets", "Mark guides", "Progress tracking"].map((item) => (
            <li key={item} className="flex gap-2"><Check className="size-4 text-brass" /> {item}</li>
          ))}
        </ul>
        {!subscribed && (
          <button type="button" onClick={() => setOpen(true)} className="mt-6 w-full rounded-full bg-primary py-3 font-semibold">
            Pay ₦4,500
          </button>
        )}
      </article>
      <p className="mt-4 text-sm text-muted">Pay with card, bank transfer or USSD. Questions? hello@richmirabel.com</p>
      {receipt && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <p className="font-display text-2xl">Payment received</p>
          <p className="mt-1 text-sm">Reference {receipt} · ₦4,500</p>
          <button type="button" onClick={() => navigate({ to: "/studio" })} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
            Start practising
          </button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6">
            <h2 className="font-display text-3xl">₦4,500</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["Card", "Bank transfer", "USSD"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-xl border px-2 py-3 text-sm ${method === item ? "border-primary bg-soft" : "border-line"}`}>
                  {item}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm">{error}</p>}
            <button type="button" disabled={busy} onClick={pay} className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60">
              {busy ? "Confirming payment…" : "Pay ₦4,500"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-3 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
