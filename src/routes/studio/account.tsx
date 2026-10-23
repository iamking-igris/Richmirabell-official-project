import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { demoInventory } from "@/data/demo";
import { useContent } from "@/lib/content";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/studio/account")({ component: AccountPage });

function AccountPage() {
  const navigate = useNavigate();
  const name = useSession((s) => s.name);
  const email = useSession((s) => s.email);
  const exams = useSession((s) => s.exams);
  const jamb = useSession((s) => s.jambSubjects);
  const demoMode = useSession((s) => s.demoMode);
  const setDemoMode = useSession((s) => s.setDemoMode);
  const clearDemoAttempts = useSession((s) => s.clearDemoAttempts);
  const clearAllAttempts = useSession((s) => s.clearAllAttempts);
  const leave = useSession((s) => s.leave);
  const resetContent = useContent((s) => s.resetContent);
  const inv = demoInventory();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">Account</h1>
      <p className="mt-2 text-muted">{name || "Student"}{email ? ` · ${email}` : ""}</p>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <li>
          <Link to="/studio/profile" className="flex min-h-14 items-center justify-between px-4 py-3">
            <span><span className="block font-medium">Profile and exams</span><span className="text-sm text-muted">{exams.map((e) => e.toUpperCase()).join(" and ") || "Exams not set"}</span></span>
            <span className="text-sm text-primary">Edit</span>
          </Link>
        </li>
        <li className="px-4 py-3">
          <p className="font-medium">JAMB subjects</p>
          <p className="text-sm text-muted">{jamb.length === 3 ? `English, ${jamb.join(", ")}` : "Not set"}</p>
          <Link to="/studio/profile" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Change combination</Link>
        </li>
        <li>
          <Link to="/studio/plan" className="flex min-h-14 items-center justify-between px-4 py-3">
            <span><span className="block font-medium">Access</span><span className="text-sm text-muted">Trial and term access. Payment is simulated on this device.</span></span>
            <span className="text-sm text-primary">Open</span>
          </Link>
        </li>
        <li className="px-4 py-3">
          <p className="font-medium">Security</p>
          <p className="text-sm text-muted">Passwords are not saved on a server. This is a local demo on this device.</p>
        </li>
      </ul>
      <section className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-5">
        <h2 className="font-display text-2xl">Demo / test controls</h2>
        <p className="mt-2 text-sm text-muted">Demo mode shows synthetic Physics subtopics, JAMB and WAEC papers for UI testing. They are labelled DEMO and are not teacher-approved content. No real payments or backend calls.</p>
        <label className="mt-4 flex min-h-12 items-center gap-3">
          <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} className="size-5" />
          <span className="text-sm font-medium">Demo mode {demoMode ? "on" : "off"}</span>
        </label>
        <p className="mt-3 text-xs text-muted">Seed inventory: {inv.physicsDemoTopics} Physics demo topics · {inv.physicsDemoMcq} MCQ · {inv.physicsDemoTheory} theory · JAMB bank {inv.jambBank} · WAEC papers {inv.waecPapers}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => clearDemoAttempts()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Clear demo attempts</button>
          <button type="button" onClick={() => { if (window.confirm("Clear all attempts on this device?")) clearAllAttempts(); }} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Clear all attempts</button>
          <button type="button" onClick={() => { resetContent(); window.alert("Content store reset to shipped + demo seed."); }} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Reset content seed</button>
        </div>
      </section>
      <button type="button" onClick={() => { leave(); navigate({ to: "/" }); }} className="mt-6 min-h-12 rounded-full border border-line px-6 text-sm font-semibold">Log out</button>
    </div>
  );
}
