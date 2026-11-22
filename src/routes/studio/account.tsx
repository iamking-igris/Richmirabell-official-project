import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/account")({ component: AccountPage });

function AccountPage() {
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const profile = useSession((s) => s.profile);
  const access = useSession((s) => s.access);
  const role = useSession((s) => s.role);
  const leave = useSession((s) => s.leave);
  const name = profile?.name ?? user?.name ?? "Student";
  const email = profile?.email ?? user?.email ?? "";
  const emailVerified = user?.email_verified ?? false;

  const trialLabel = access ? (access.has_access ? "Active access" : access.on_trial ? "Free trial active" : "No active access") : "Checking…";

  return (
    <div className="mx-auto max-w-2xl font-sans">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-muted">{name}{email ? ` · ${email}` : ""}</p>
      <p className="mt-1 text-sm text-muted">
        Email verified: {emailVerified ? "Yes" : "No"}
      </p>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <li>
          <Link to="/studio/profile" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Profile and exams</span>
              <span className="text-sm text-muted">
                {access ? trialLabel : "Checking access…"}
              </span>
            </span>
            <span className="text-sm font-semibold text-primary">Edit →</span>
          </Link>
        </li>

        <li className="px-4 py-3">
          <p className="font-medium">JAMB subjects</p>
          <p className="text-sm text-muted">
            {profile?.jambSubjects.length === 3
              ? `English, ${profile.jambSubjects.join(", ")}`
              : "Not set"}
          </p>
          <Link to="/studio/profile" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            Change combination
          </Link>
        </li>

        <li>
          <Link to="/studio/plan" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Access</span>
              <span className="text-sm text-muted">
                Trial: ₦0 for 2 days · Monthly access: ₦4,500 for 30 days · Renewals extend expiry.
              </span>
            </span>
            <span className="text-sm font-semibold text-primary">Open →</span>
          </Link>
        </li>

        <li>
          <Link to="/studio/guides" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Guides & Study Resources</span>
              <span className="text-sm text-muted">Study strategies, WAEC/JAMB exam tips, and subject guides.</span>
            </span>
            <span className="text-sm font-semibold text-primary">Open →</span>
          </Link>
        </li>

        <li>
          <Link to="/studio/help" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Help & Support</span>
              <span className="text-sm text-muted">Find answers to common questions and get help using Richmirabel.</span>
            </span>
            <span className="text-sm font-semibold text-primary">Open →</span>
          </Link>
        </li>

        {role === "ADMIN" && (
          <li>
            <Link to="/admin" className="flex min-h-14 items-center justify-between px-4 py-3 bg-soft/50 hover:bg-soft transition-colors">
              <span>
                <span className="block font-semibold text-primary">Admin Studio</span>
                <span className="text-sm text-muted">Administration dashboard, content library, and CBT bank.</span>
              </span>
              <span className="text-sm font-semibold text-primary">Admin →</span>
            </Link>
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => {
          void leave();
          navigate({ to: "/" });
        }}
        className="mt-6 min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-paper transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
