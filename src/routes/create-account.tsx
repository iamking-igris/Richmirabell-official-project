import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/create-account")({ component: CreateAccount });

type Fields = { name: string; email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Fields, string>>;

const empty: Fields = { name: "", email: "", password: "", confirm: "" };

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  const name = fields.name.trim();
  if (name.length < 2 || name.length > 20) errors.name = "Enter your first name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = "Enter a valid email address.";
  if (fields.password.length < 8) errors.password = "Use at least 8 characters.";
  if (fields.password !== fields.confirm) errors.confirm = "Passwords do not match.";
  return errors;
}

function CreateAccount() {
  const navigate = useNavigate();
  const existing = useSession((s) => s.name);
  const enter = useSession((s) => s.enter);
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
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
            Your progress is saved on this device. Next you choose WAEC, JAMB, or both, then Physics opens. Your two free days start after that.
          </p>
          {existing && status !== "success" && (
            <p className="mt-4 border border-line bg-surface px-4 py-3 text-sm">
              {existing} is already signed in on this device.{" "}
              <Link to="/studio" className="font-semibold text-primary">
                Continue learning
              </Link>
            </p>
          )}

          {status === "success" ? (
            <div className="mt-8 border border-line bg-surface p-6" role="status">
              <p className="font-display text-2xl">Account ready.</p>
              <p className="mt-2 text-sm text-muted">Next, tell us which exam you are preparing for.</p>
              <Link to="/studio" className="mt-5 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg">
                Continue learning
              </Link>
            </div>
          ) : (
            <form
              className="mt-8 space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const next = validate(fields);
                setErrors(next);
                if (Object.keys(next).length > 0) {
                  setStatus("error");
                  setFormError("Check the fields below.");
                  return;
                }
                if (existing) {
                  navigate({ to: "/studio" });
                  return;
                }
                setStatus("submitting");
                setFormError("");
                window.setTimeout(() => {
                  enter(fields.name.trim(), fields.email.trim());
                  navigate({ to: "/onboarding" });
                }, 400);
              }}
            >
              <Field id="first-name" label="First name" error={errors.name} value={fields.name} autoComplete="given-name" onChange={(value) => set("name", value)} />
              <Field id="email" label="Email address" type="email" error={errors.email} value={fields.email} autoComplete="email" onChange={(value) => set("email", value)} />
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
                <p className="text-sm text-ink" role="alert">
                  {formError}
                </p>
              )}
              <button type="submit" disabled={status === "submitting"} className="inline-flex min-h-11 w-full items-center justify-center bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60 sm:w-auto sm:px-8">
                {status === "submitting" ? "Starting your trial…" : "Create account"}
              </button>
              <p className="text-sm text-muted">
                Sign-in on another device is not available yet.
                {existing ? (
                  <>
                    {" "}
                    <Link to="/studio" className="font-semibold text-primary">
                      Continue on this device
                    </Link>
                  </>
                ) : null}
              </p>
            </form>
          )}
        </div>
        <img src="/media/atelier.jpg" alt="An open green book and a brass compass on warm paper" className="photo hidden aspect-[4/3] w-full object-cover lg:block" />
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
          <button type="button" className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center text-muted" aria-pressed={toggle.show} aria-label={toggle.show ? "Hide password" : "Show password"} onClick={toggle.onToggle}>
            {toggle.show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
