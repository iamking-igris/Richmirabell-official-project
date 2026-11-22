import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { googleClientId, promptGoogleSignIn } from "@/lib/google";
import { useSession } from "@/lib/session";
import { ApiError } from "@/services/api/errors";

export const Route = createFileRoute("/create-account")({ component: CreateAccount });

type Fields = { name: string; email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Fields, string>>;

const empty: Fields = { name: "", email: "", password: "", confirm: "" };

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  const name = fields.name.trim();
  if (name.length < 1 || name.length > 160) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = "Enter a valid email address.";
  if (fields.password.length < 8) errors.password = "Use at least 8 characters.";
  if (fields.password.length > 72) errors.password = "Use 72 characters or fewer.";
  if (fields.password !== fields.confirm) errors.confirm = "Passwords do not match.";
  return errors;
}

function CreateAccount() {
  const navigate = useNavigate();
  const existing = useSession((s) => s.name);
  const register = useSession((s) => s.register);
  const loginWithGoogle = useSession((s) => s.loginWithGoogle);
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "google" | "error">("idle");
  const [formError, setFormError] = useState("");

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <BrandMark />
          <Link to="/" className="text-sm text-muted hover:text-ink">
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Create your account</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Create your account to save your learning progress and access Richmirabel across your devices.
          </p>
          {existing && (
            <p className="mt-4 border border-line bg-surface px-4 py-3 text-sm">
              {existing} is already signed in on this device.{" "}
              <Link to="/studio" className="font-semibold text-primary">
                Continue learning
              </Link>
            </p>
          )}

          <div className="mt-8 space-y-6">
            <button
              type="button"
              onClick={async () => {
                setFormError("");
                setStatus("google");
                try {
                  const credential = await promptGoogleSignIn();
                  await loginWithGoogle(credential);
                  navigate({ to: "/start" });
                } catch (err) {
                  setFormError(err instanceof Error ? err.message : "Google sign-up failed.");
                  setStatus("error");
                }
              }}
              disabled={status === "submitting" || status === "google"}
              className="flex min-h-12 w-full items-center justify-center gap-3 border border-line bg-surface px-4 py-3 font-semibold text-ink shadow-xs transition hover:bg-soft focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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
              {status === "google" ? "Connecting…" : "Continue with Google"}
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <span className="relative bg-paper px-3 text-xs uppercase tracking-wider text-muted">
                Or continue with email
              </span>
            </div>

            <form
              className="space-y-4"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                const next = validate(fields);
                setErrors(next);
                if (Object.keys(next).length > 0) {
                  setStatus("error");
                  setFormError("Check the fields below.");
                  return;
                }
                setStatus("submitting");
                setFormError("");
                try {
                  await register(fields.name.trim(), fields.email.trim(), fields.password);
                  navigate({ to: "/start" });
                } catch (err) {
                  setStatus("error");
                  setFormError(
                    err instanceof ApiError ? err.message : "Could not create your account. Try again.",
                  );
                }
              }}
            >
              <Field
                id="first-name"
                label="Name"
                error={errors.name}
                value={fields.name}
                autoComplete="name"
                onChange={(value) => set("name", value)}
              />
              <Field
                id="email"
                label="Email address"
                type="email"
                error={errors.email}
                value={fields.email}
                autoComplete="email"
                onChange={(value) => set("email", value)}
              />
              <Field
                id="password"
                label="Password"
                type={show ? "text" : "password"}
                error={errors.password}
                value={fields.password}
                autoComplete="new-password"
                onChange={(value) => set("password", value)}
                toggle={{ show, onToggle: () => setShow((v) => !v) }}
              />
              <Field
                id="confirm"
                label="Confirm password"
                type={show ? "text" : "password"}
                error={errors.confirm}
                value={fields.confirm}
                autoComplete="new-password"
                onChange={(value) => set("confirm", value)}
              />
              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "submitting" || status === "google"}
                className="inline-flex min-h-11 w-full items-center justify-center bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {status === "submitting" ? "Creating your account…" : "Create account"}
              </button>
              <p className="text-sm text-muted">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary">
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>
        <img
          src="/media/atelier.jpg"
          alt="An open green book and a brass compass on warm paper"
          className="photo hidden aspect-[4/3] w-full object-cover lg:block"
        />
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  toggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete: string;
  toggle?: { show: boolean; onToggle: () => void };
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border border-line bg-surface px-3 py-3 outline-none focus:border-primary"
        />
        {toggle && (
          <button
            type="button"
            className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center text-muted"
            aria-pressed={toggle.show}
            aria-label={toggle.show ? "Hide password" : "Show password"}
            onClick={toggle.onToggle}
          >
            {toggle.show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
