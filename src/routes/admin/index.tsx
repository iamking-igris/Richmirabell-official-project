import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/backend";
import { plural } from "@/lib/format";
import { ApiError } from "@/services/api/errors";
import { AdminStatSkeleton, AdminTableSkeleton } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/")({ component: Overview });

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

export function Overview() {
  const [overview, setOverview] = useState<{
    totalStudents: number;
    newlyRegistered: number;
    activeSubscriptions: number;
    totalRevenue: number;
    pendingPayments: number;
    pendingReviews: number;
    draftTopics: number;
  } | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string; hasAccess: boolean; subscribed: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ov, st] = await Promise.all([adminApi.overview(), adminApi.students()]);
      setOverview(ov);
      setStudents(
        st.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email ?? "",
          hasAccess: s.hasAccess,
          subscribed: s.subscribed,
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the admin overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <header>
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-xl text-muted">
          Manage students, content, payments, and subscriptions for Richmirabel.
        </p>
      </header>

      {loading ? (
        <div className="mt-6 space-y-8" aria-busy="true" aria-live="polite">
          <div className="overflow-hidden rounded-3xl bg-ink px-6 py-8">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/20" />
            <div className="mt-3 h-8 w-80 max-w-full animate-pulse rounded-xl bg-white/15" />
          </div>
          <AdminStatSkeleton count={6} />
          <AdminTableSkeleton rows={4} columns={3} />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <h1 className="font-display text-3xl">Could not load the workspace</h1>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg"
          >
            Try again
          </button>
        </div>
      ) : overview ? (
        <>
          <section className="mt-6 overflow-hidden rounded-3xl bg-ink px-6 py-8 text-primary-fg sm:px-8">
            <p className="text-xs font-semibold tracking-wide text-brass">Welcome back</p>
            <p className="mt-2 max-w-xl font-display text-2xl sm:text-3xl">
              Your Richmirabel admin workspace is ready.
            </p>
          </section>

          <section className="mt-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Students" value={overview.totalStudents} />
              <Stat label="New this week" value={overview.newlyRegistered} />
              <Stat label="Active subscriptions" value={overview.activeSubscriptions} />
              <Stat label="Revenue (₦)" value={overview.totalRevenue} />
              <Stat label="Pending payments" value={overview.pendingPayments} />
              <Stat label="Draft topics" value={overview.draftTopics} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-2xl">Quick Actions</h2>
            <p className="mt-1 text-sm text-muted">Continue working on the most important admin tasks.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link
                to="/admin/subjects"
                className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5"
              >
                <span className="text-primary"><BookOpen className="size-5" aria-hidden /></span>
                <p className="mt-3 font-display text-xl">Manage Subjects & Content</p>
                <p className="mt-1 text-sm text-muted">
                  Organise subjects, topics, learning notes, and topic quizzes.
                </p>
              </Link>
              <Link
                to="/admin/cbt"
                className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5"
              >
                <span className="text-primary"><ClipboardList className="size-5" aria-hidden /></span>
                <p className="mt-3 font-display text-xl">Weekly CBT Generator</p>
                <p className="mt-1 text-sm text-muted">
                  Build, generate, review, and publish weekly AI-powered examination papers.
                </p>
              </Link>
              <Link
                to="/admin/students"
                className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5"
              >
                <span className="text-primary"><BookOpen className="size-5" aria-hidden /></span>
                <p className="mt-3 font-display text-xl">Students</p>
                <p className="mt-1 text-sm text-muted">Manage access and manual grants.</p>
              </Link>
              <Link
                to="/admin/payments"
                className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5"
              >
                <span className="text-primary"><ClipboardList className="size-5" aria-hidden /></span>
                <p className="mt-3 font-display text-xl">Payments</p>
                <p className="mt-1 text-sm text-muted">Review transactions and revenue.</p>
              </Link>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Students</h2>
                <p className="mt-1 text-sm text-muted">
                  Latest registered students and their access status.
                </p>
              </div>
              <Link to="/admin/students" className="text-sm font-semibold text-primary">
                View all students
              </Link>
            </div>
            {students.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
                <p className="font-display text-2xl">No students yet.</p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {students.slice(0, 6).map((student) => (
                  <li key={student.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted">
                        {student.email} · {student.subscribed ? "Active" : student.hasAccess ? "Trial" : "No access"}
                      </p>
                    </div>
                    <Link
                      to="/admin/students"
                      className="text-sm font-semibold text-primary"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">No overview data available.</p>
        </div>
      )}
    </div>
  );
}
