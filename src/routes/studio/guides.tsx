import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/studio/guides")({ component: GuidesPage });

type Category = "all" | "briefings" | "answering" | "tips";

function GuidesPage() {
  const news = useContent((s) => s.news);
  const guides = useContent((s) => s.guides);
  const [category, setCategory] = useState<Category>("all");
  const [open, setOpen] = useState<string | null>(null);

  const items = [
    ...news.map((item) => ({ id: item.id, title: item.title, body: item.body, category: "briefings" as const, note: "General study advice" })),
    ...guides.map((item) => ({
      id: item.id,
      title: item.title,
      body: [item.detail, ...item.points].join("\n"),
      category: item.id === "objectives" || item.id === "practical" ? ("tips" as const) : ("answering" as const),
      note: item.id === "theory" ? "General advice, not a universal marking scheme" : "General advice",
    })),
  ];
  const shown = items.filter((item) => category === "all" || item.category === category);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Guides</h1>
          <p className="mt-2 max-w-xl text-muted">Practical exam advice and answer-writing guidance to help students prepare and earn marks.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold print:hidden">
          Print this guide
        </button>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Guide categories">
        {(
          [
            ["all", "All"],
            ["briefings", "Exam Briefings"],
            ["answering", "Answering Guides"],
            ["tips", "Objective & Practical Tips"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={category === id}
            onClick={() => setCategory(id)}
            className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm", category === id ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface")}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing in this category yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-surface">
              <button type="button" onClick={() => setOpen(open === item.id ? null : item.id)} className="flex w-full min-h-14 items-start justify-between gap-3 px-4 py-3 text-left">
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="text-xs text-muted">{item.note}</span>
                </span>
                <span className="text-sm text-muted">{open === item.id ? "Close" : "Open"}</span>
              </button>
              {open === item.id && (
                <div className="border-t border-line px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
                  {item.id === "theory" && (
                    <p className="mb-2 text-muted">This is general advice. Mark allocations change with the question. Answer what that question asks. Do not treat any split as a universal WAEC scheme.</p>
                  )}
                  {item.body}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
