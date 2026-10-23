import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/briefings")({ component: Briefings });

function Briefings() {
  const news = useContent((s) => s.news);
  const upsertNews = useContent((s) => s.upsertNews);
  const removeNews = useContent((s) => s.removeNews);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div>
      <h1 className="font-display text-4xl">Briefings</h1>
      <form className="mt-6 space-y-2" onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        upsertNews({ id: "n-" + Date.now(), tag: "Study", title: title.trim(), date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), body: body.trim() || title.trim() });
        setTitle("");
        setBody("");
      }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-line bg-surface px-3 py-3" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="The briefing" rows={4} className="w-full rounded-xl border border-line bg-surface px-3 py-3" />
        <button className="rounded-full bg-primary px-4 py-3 font-semibold text-primary-fg">Publish</button>
      </form>
      <ul className="mt-6 space-y-2">
        {news.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <span>{item.title}</span>
            <button type="button" className="text-sm text-muted" onClick={() => { if (confirm(`Remove “${item.title}”?`)) removeNews(item.id); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
