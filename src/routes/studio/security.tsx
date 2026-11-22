import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  User,
  Lock,
  ArrowLeft,
  Key,
  LogOut,
  Info,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/security")({
  component: StudentSecurityPage,
});

export function StudentSecurityPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const email = useSession((s) => s.email);
  const exams = useSession((s) => s.exams);
  const jambSubjects = useSession((s) => s.jambSubjects);
  const subscribed = useSession((s) => s.subscribed);
  const leave = useSession((s) => s.leave);

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out of your student session?")) {
      leave();
      navigate({ to: "/" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 font-sans pb-16">
      {/* Header & Back Control */}
      <div className="space-y-4">
        <Link
          to="/studio/account"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to Account
        </Link>

        <div>
          <h1 className="font-display text-4xl text-ink">Security</h1>
          <p className="mt-1.5 text-sm text-muted">
            Manage your account access and review the security information for your Richmirabel account.
          </p>
        </div>
      </div>

      {/* Account Security Information */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Account Security & Data Architecture</h2>
            <p className="text-xs text-muted">How your student data is preserved on this device</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-muted leading-relaxed font-sans">
          <div className="flex items-start gap-3 rounded-xl border border-line bg-paper/50 p-3.5 text-ink">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs">Local Browser Session</p>
              <p className="text-muted text-[11px] leading-relaxed">
                Your student profile, subject selections, quiz scores, and CBT attempt logs are stored securely in your web browser session (<code className="bg-paper px-1 py-0.5 rounded text-ink font-mono">localStorage</code>).
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-ink font-semibold">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Passwords are not saved on a remote server.</span>
            </div>
            <p className="text-[11px] pl-5 text-muted">
              Because credentials are not transmitted across external networks, your session cannot be intercepted via remote password leaks.
            </p>
          </div>
        </div>
      </div>

      {/* Current Active Session */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Laptop className="size-4.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Current Active Session</h2>
            <p className="text-xs text-muted">Active identity on this browser device</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper/50 p-3.5">
              <span className="text-muted text-[11px] block">Student Candidate</span>
              <p className="font-bold text-ink text-sm mt-0.5">{name || "Student Candidate"}</p>
            </div>

            <div className="rounded-xl border border-line bg-paper/50 p-3.5">
              <span className="text-muted text-[11px] block">Associated Email</span>
              <p className="font-bold text-ink text-sm mt-0.5">{email || "student@gmail.com"}</p>
            </div>

            <div className="rounded-xl border border-line bg-paper/50 p-3.5">
              <span className="text-muted text-[11px] block">Session Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Active ({subscribed ? "Term Subscription" : "Free Trial"})
              </span>
            </div>

            <div className="rounded-xl border border-line bg-paper/50 p-3.5">
              <span className="text-muted text-[11px] block">Target Examinations</span>
              <p className="font-bold text-ink text-xs mt-0.5 uppercase">
                {exams.length ? exams.join(" & ") : "Science Pathway"}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-semibold text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign Out of Session
            </button>
          </div>
        </div>
      </div>

      {/* Password Management Notice */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Key className="size-4.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Password Management</h2>
            <p className="text-xs text-muted">Authentication status details</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted leading-relaxed font-sans">
          <p>
            Your password is validated against the Richmirabel backend. If you forget it, use the{" "}
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Forgot password
            </Link>{" "}
            link on the sign-in screen to request a reset. A one-time reset link is sent to your email when
            delivery is configured.
          </p>
          <p className="text-[11px]">
            Your session token is stored in your browser and sent to the backend on each request. Signing out
            revokes the current session on the server.
          </p>
        </div>
      </div>
    </div>
  );
}
