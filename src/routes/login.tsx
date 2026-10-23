import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const enter = useSession((s) => s.enter);
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const email = String(data.get("email") || "").trim();
          const password = String(data.get("password") || "");
          if (!email.includes("@") || password.length < 6) {
            setError("Check your email and password.");
            return;
          }
          const name = email.split("@")[0] || "Student";
          enter(name.charAt(0).toUpperCase() + name.slice(1), email);
          const done = useSession.getState().onboardingComplete;
          navigate({ to: done ? "/studio" : "/onboarding" });
        }}
      >
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Log in to continue Physics. Progress stays on this device.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary"
          placeholder="ada@example.com"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary"
          placeholder="Your password"
        />

        {error && <p className="mt-3 text-sm text-ink">{error}</p>}

        <button type="submit" className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg">
          Log in
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/forgot-password" className="text-muted">
            Forgot password?
          </Link>
          <br />
          New here?{" "}
          <Link to="/create-account" className="font-medium text-primary">
            Start free trial
          </Link>
        </p>
      </form>
    </div>
  );
}
