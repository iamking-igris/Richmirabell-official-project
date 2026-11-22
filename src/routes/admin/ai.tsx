import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ai")({ component: AiPage });

export function AiPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">AI & OCR pipeline</h1>
      <p className="mt-2 max-w-xl text-muted">
        Lessons extracted from photographs or AI generation are handled by the frontend OCR service and saved as
        <strong>drafts only</strong>. They are never auto-published. An administrator must open the topic editor and
        explicitly publish a lesson before students can see it.
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          To add AI-generated content, open a topic in the content editor, use the notes/OCR extraction tools, then
          publish the topic from the editor.
        </p>
      </div>
    </div>
  );
}
