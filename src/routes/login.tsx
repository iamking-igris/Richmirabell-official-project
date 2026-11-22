import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { googleClientId, promptGoogleSignIn } from "@/lib/google";
import { useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const login = useSession((s) => s.login);
  const loginWithGoogle = useSession((s) => s.loginWithGoogle);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  async function finish(user: { role: string; onboarding_complete: boolean }) {
    if (user.role === "ADMIN") {
      navigate({ to: "/admin" });
      return;
    }
    navigate({ to: user.onboarding_complete ? "/studio" : "/start" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const email = String(data.get("email") || "").trim();
          const password = String(data.get("password") || "");
          setError("");
          setBusy("email");
          try {
            const user = await login(email, password);
            await finish(user);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
          } finally {
            setBusy(null);
          }
        }}
      >
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Log in to continue your preparation. Your progress is saved to your account.
        </p>

        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            setError("");
            setBusy("google");
            try {
              const credential = await promptGoogleSignIn();
              const user = await loginWithGoogle(credential);
              await finish(user);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Google sign-in failed.");
            } finally {
              setBusy(null);
            }
          }}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 border border-line bg-paper px-4 py-3 font-semibold text-ink shadow-xs transition hover:bg-soft focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          title={googleClientId() ? "Continue with Google" : "Google sign-in is not configured"}
        >
          <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.1-6.68-4.93H1.36v3.15C3.35 21.32 7.39 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.36C.49 8.31 0 10.1 0 12s.49 3.69 1.36 5.42l3.96-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.23 0 12 0 7.39 0 3.35 2.68 1.36 6.58l3.96 3.15c.94-2.83 3.57-4.98 6.68-4.98z"
            />
          </svg>
          {busy === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line" />
          </div>
          <span className="relative bg-surface px-3 text-xs uppercase tracking-wider text-muted">
            Or log in with email
          </span>
        </div>

        <label className="block text-sm font-medium" htmlFor="email">
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

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60"
        >
          {busy === "email" ? "Signing in…" : "Log in"}
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
