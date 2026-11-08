export type DemoUser = {
  id: string; name: string; email: string; registered: string; status: "Active" | "Suspended";
  subjects: string[]; lastActive: string; access: "Trial" | "Paid" | "Expired" | "Manual";
};
export type DemoTicket = { id: string; user: string; category: string; body: string; status: "Open" | "Pending" | "Closed"; priority: "Low" | "Normal" | "High"; };
export type DemoJob = { id: string; type: "Notes" | "Quiz"; pages: number; status: "Queued" | "Needs review" | "Completed" | "Failed"; created: string; };
export type AuditEvent = { id: string; actor: string; action: string; target: string; at: string; reason?: string; };

export const demoUsers: DemoUser[] = [];
export const demoTickets: DemoTicket[] = [];
export const demoJobs: DemoJob[] = [];
export const demoAudit: AuditEvent[] = [];

const KEY = "richmirabel-admin-ops";
type Ops = { tickets: DemoTicket[]; jobs: DemoJob[]; audit: AuditEvent[]; users: DemoUser[] };

export function loadOps(): Ops {
  if (typeof localStorage === "undefined") return { tickets: demoTickets, jobs: demoJobs, audit: demoAudit, users: demoUsers };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tickets: demoTickets, jobs: demoJobs, audit: demoAudit, users: demoUsers };
    const parsed = JSON.parse(raw) as Ops;
    // Strip known synthetic data if present
    const cleanedUsers = (parsed.users || []).filter((u) => !["u_01", "u_02", "u_03", "u_04", "u_05"].includes(u.id) && !u.email.endsWith("@example.com"));
    const cleanedTickets = (parsed.tickets || []).filter((t) => !["t_01", "t_02", "t_03"].includes(t.id));
    const cleanedJobs = (parsed.jobs || []).filter((j) => !["j_notes_01", "j_quiz_01", "j_notes_02", "j_quiz_02"].includes(j.id));
    const cleanedAudit = (parsed.audit || []).filter((a) => !["a1", "a2", "a3"].includes(a.id));
    return { tickets: cleanedTickets, jobs: cleanedJobs, audit: cleanedAudit, users: cleanedUsers };
  } catch { return { tickets: demoTickets, jobs: demoJobs, audit: demoAudit, users: demoUsers }; }
}
export function saveOps(ops: Ops) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ops));
}
