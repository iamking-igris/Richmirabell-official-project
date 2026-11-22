import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { authApi } from "@/lib/backend";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

const RESEND_COOLDOWN_SECONDS = 60;

type Step = "request" | "sent" | "reset" | "done";

function initialUrlToken(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

function clearUrlToken() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.has("token")) {
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, url.toString());
  }
}

function Forgot() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [requestError, setRequestError] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const urlToken = initialUrlToken();

  // Never leave the reset token in the browser URL or history.
  useEffect(() => {
    if (urlToken) {
      clearUrlToken();
    }
  }, [urlToken]);

  // A token in the URL means the user followed a reset link.
  useEffect(() => {
    setStep(urlToken ? "reset" : "request");
  }, [urlToken]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendSeconds > 0) {
      resendTimerRef.current = setInterval(() => {
        setResendSeconds((current) => (current > 1 ? current - 1 : 0));
      }, 1000);
    } else if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, [resendSeconds]);

  const canResend = resendSeconds === 0 && !requestBusy && !!email;

  const handleRequestSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setRequestError("");
      setRequestBusy(true);
      try {
        await authApi.requestPasswordReset(email.trim().toLowerCase());
        setStep("sent");
        setResendSeconds(RESEND_COOLDOWN_SECONDS);
      } catch (err) {
        setRequestError(
          err instanceof ApiError
            ? err.message
            : "Could not request a reset link. Try again.",
        );
      } finally {
        setRequestBusy(false);
      }
    },
    [email],
  );

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    setRequestError("");
    setRequestBusy(true);
    try {
      await authApi.requestPasswordReset(email.trim().toLowerCase());
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setRequestError(
        err instanceof ApiError
          ? err.message
          : "Could not resend the reset link. Try again.",
      );
    } finally {
      setRequestBusy(false);
    }
  }, [email, canResend]);

  const handleResetSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setResetError("");
      if (password.length < 8) {
        setResetError("Use at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setResetError("Passwords do not match.");
        return;
      }
      setResetBusy(true);
      try {
        await authApi.confirmPasswordReset(urlToken, password);
        setStep("done");
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 400) {
          setResetError(
            "This reset link is invalid or has expired. Request a new one.",
          );
        } else {
          setResetError(
            err instanceof Error
              ? err.message
              : "Could not reset the password. Try again.",
          );
        }
      } finally {
        setResetBusy(false);
      }
    },
    [password, confirm, urlToken],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md border border-line bg-surface p-8">
        <BrandMark />

        {/* Step 1 — Request reset */}
        {step === "request" && (
          <>
            <h1 className="mt-6 font-display text-3xl">Reset your password</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Enter your email address and we will send you a password reset link.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleRequestSubmit}
            >
              <label className="block text-sm font-medium" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary"
                placeholder="ada@example.com"
              />

              {requestError && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {requestError}
                </p>
              )}

              <button
                type="submit"
                disabled={requestBusy}
                className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60"
              >
                {requestBusy ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {/* Step 1b — Reset link sent */}
        {step === "sent" && (
          <>
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg className="size-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 font-display text-3xl">Check your email</h1>
              <p className="mt-2 max-w-md text-sm text-muted">
                If an account exists for this email address, you will receive a
                password reset link shortly.
              </p>
            </div>

            <div className="mt-6 border border-line bg-paper p-4 rounded-2xl text-sm">
              <p className="font-medium text-ink">What happens next</p>
              <ul className="mt-3 space-y-2 text-muted list-disc pl-5">
                <li>Check your inbox for a message from Richmirabel.</li>
                <li>Open the link to set a new password.</li>
                <li>Links expire after a short time for your security.</li>
              </ul>
            </div>

            <div className="mt-6">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-3 font-semibold text-primary hover:bg-soft transition-colors"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend link
                </button>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-3 font-semibold text-muted disabled:opacity-60"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resend link in {resendSeconds}s
                </button>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {/* Step 2/3 — Set new password */}
        {step === "reset" && (
          <>
            <h1 className="mt-6 font-display text-3xl">Set a new password</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Choose a strong password for your Richmirabel account.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleResetSubmit}>
              <label className="block text-sm font-medium" htmlFor="password">
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label className="mt-4 block text-sm font-medium" htmlFor="confirm">
                Confirm new password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirm"
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {resetError && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {resetError}
                </p>
              )}

              <button
                type="submit"
                disabled={resetBusy}
                className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60"
              >
                {resetBusy ? "Changing…" : "Set new password"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Didn&rsquo;t receive a link?{" "}
              <button
                type="button"
                onClick={() => setStep("request")}
                className="font-semibold text-primary hover:underline"
              >
                Request a new one
              </button>
            </p>
            <p className="mt-1 text-center text-sm text-muted">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {/* Step 4 — Password changed */}
        {step === "done" && (
          <>
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg className="size-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 font-display text-3xl">Password changed</h1>
              <p className="mt-2 max-w-md text-sm text-muted">
                Your password has been updated successfully. Use your new
                password to sign in.
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline"
              >
                Sign in with your new password
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
