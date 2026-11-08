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
        <p className="mt-2 text-sm text-muted">Enter your account email address below and we will send you a password reset link.</p>
        {sent ? (
          <div className="mt-6 border border-line bg-paper p-4 text-sm" role="status">
            <p className="font-semibold text-ink">Reset link sent!</p>
            <p className="mt-1 text-muted">
              We sent a password recovery link to <span className="font-mono text-ink">{email}</span>. Check your inbox to set a new password.
            </p>
            <Link to="/login" className="mt-4 inline-block font-semibold text-primary">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSent(true);
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="ada@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line bg-paper px-3 py-3 outline-none focus:border-primary"
            />
            <button type="submit" className="min-h-11 w-full bg-primary text-sm font-semibold text-primary-fg">
              Send reset link
            </button>
            <Link to="/login" className="block text-center text-sm text-muted hover:text-ink">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
