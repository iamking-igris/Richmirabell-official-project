import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md border border-line bg-surface p-8">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">Reset your password</h1>
        <p className="mt-2 text-sm text-muted">Password reset by email is not available yet. Write to hello@richmirabel.com and we will help you get back in.</p>
        {sent ? (
          <p className="mt-6 text-sm" role="status">
            Email reset is not switched on yet. Write to hello@richmirabel.com from {email} and we will help you back in. <Link to="/login" className="text-primary">Back to sign in</Link>
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <label className="block text-sm" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-line bg-paper px-3 py-3 outline-none focus:border-primary" />
            <button type="submit" className="min-h-11 w-full bg-primary text-sm font-semibold text-primary-fg">
              Send reset link
            </button>
            <Link to="/login" className="block text-center text-sm text-muted">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
