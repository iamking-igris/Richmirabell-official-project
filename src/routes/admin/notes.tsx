import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { loadOps, saveOps } from "@/lib/admin-ops";

export const Route = createFileRoute("/admin/notes")({ component: NotesStudio });

function NotesStudio() {
  const [pages, setPages] = useState<{ name: string }[]>([]);
  const [status, setStatus] = useState<"Draft" | "Needs review" | "Approved" | "Published">("Draft");
  const [title, setTitle] = useState("Waves — from photographed notes");
  const [body, setBody] = useState("v = fλ. Wavelength is the distance between successive crests. Frequency is the number of complete waves per second.");
  const jobs = loadOps().jobs;

  function onFiles(list: FileList | null) {
    if (!list) return;
    setPages(Array.from(list).map((f) => ({ name: f.name })));
    setStatus("Needs review");
  }

  function publish() {
    const ops = loadOps();
    ops.jobs = [{ id: `j_notes_${Date.now()}`, type: "Notes", pages: pages.length || 1, status: "Completed", created: new Date().toISOString().slice(0, 10) }, ...ops.jobs];
    ops.audit = [{ id: `a_${Date.now()}`, actor: "admin", action: "Published lesson", target: title, at: new Date().toLocaleString("en-NG") }, ...ops.audit];
    saveOps(ops);
    setStatus("Published");
  }

  return (
    <div>
      <h1 className="font-display text-4xl">Notes Studio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Upload photographs of notes, review the extracted draft, and publish content.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Source pages</h2>
          <label className="mt-4 flex min-h-28 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-line bg-paper text-sm">
            <input type="file" accept="image/*,.pdf" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            Drop or choose page photos
          </label>
          <ul className="mt-3 space-y-1 text-sm">
            {pages.length === 0 && <li className="text-muted">No pages yet.</li>}
            {pages.map((p, i) => <li key={p.name + i} className="rounded-lg border border-line px-3 py-2">{i + 1}. {p.name}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">Status: {status}</p>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Extracted draft</h2>
          <label className="mt-4 block text-sm" htmlFor="title">Lesson title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
          <label className="mt-3 block text-sm" htmlFor="body">Notes</label>
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" />
          <p className="mt-2 text-xs text-muted">Objectives must come from the teacher. Nothing here is invented as an objective.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStatus("Approved")} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Mark approved</button>
            <button type="button" onClick={publish} className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg">Publish</button>
          </div>
          {status === "Published" && <p className="mt-3 text-sm">Published locally. Student notes still use the existing content store.</p>}
        </section>
      </div>
      <p className="mt-6 text-sm text-muted">Recent jobs: {jobs.filter((j) => j.type === "Notes").length} notes jobs queued. <Link to="/admin/ai" className="text-primary">Open AI Operations</Link></p>
    </div>
  );
}
