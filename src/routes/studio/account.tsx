import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/account")({ component: AccountPage });

function AccountPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const email = useSession((s) => s.email);
  const exams = useSession((s) => s.exams);
  const jamb = useSession((s) => s.jambSubjects);
  const leave = useSession((s) => s.leave);

  return (
    <div className="mx-auto max-w-2xl font-sans">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-muted">{name || "Student"}{email ? ` · ${email}` : ""}</p>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <li>
          <Link to="/studio/profile" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Profile and exams</span>
              <span className="text-sm text-muted">{exams.map((e) => e.toUpperCase()).join(" and ") || "Exams not set"}</span>
            </span>
            <span className="text-sm font-semibold text-primary">Edit →</span>
          </Link>
        </li>

        <li className="px-4 py-3">
          <p className="font-medium">JAMB subjects</p>
          <p className="text-sm text-muted">{jamb.length === 3 ? `English, ${jamb.join(", ")}` : "Not set"}</p>
          <Link to="/studio/profile" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            Change combination
          </Link>
        </li>

        <li>
          <Link to="/studio/plan" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Access</span>
              <span className="text-sm text-muted">Trial and term access. Payment is simulated on this device.</span>
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
          <Link to="/studio/security" className="flex min-h-14 items-center justify-between px-4 py-3 hover:bg-paper/50 transition-colors">
            <span>
              <span className="block font-medium">Security</span>
              <span className="text-sm text-muted">Review account security architecture and active session details.</span>
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

        {(email.toLowerCase() === "admin@gmail.com" || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("richmirabel-admin") === "1")) && (
          <li>
            <Link to="/admin" className="flex min-h-14 items-center justify-between px-4 py-3 bg-soft/50 hover:bg-soft transition-colors">
              <span>
                <span className="block font-semibold text-primary">Admin Studio</span>
                <span className="text-sm text-muted">Access administration dashboard, content library, and JAMB CBT generator.</span>
              </span>
              <span className="text-sm font-semibold text-primary">Admin →</span>
            </Link>
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => {
          leave();
          navigate({ to: "/" });
        }}
        className="mt-6 min-h-12 rounded-full border border-line px-6 text-sm font-semibold hover:bg-paper transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
