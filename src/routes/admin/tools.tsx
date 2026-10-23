import { createFileRoute } from "@tanstack/react-router";
import { useContent } from "@/lib/content";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/admin/tools")({ component: Tools });

function Tools() {
  const resetTrial = useSession((s) => s.resetTrial);
  const leave = useSession((s) => s.leave);
  const resetContent = useContent((s) => s.resetContent);
  return (
    <div className="max-w-lg">
      <h1 className="font-display text-4xl">Device tools</h1>
      <p className="mt-2 text-sm text-muted">These only change this browser.</p>
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-left" onClick={() => resetTrial()}>Preview trial ended</button>
        <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-left" onClick={() => leave()}>Reset this device</button>
        <button type="button" className="rounded-full border border-line bg-surface px-4 py-3 text-left" onClick={() => { if (confirm("Replace every note and question with the original set?")) resetContent(); }}>Reset content to defaults</button>
      </div>
    </div>
  );
}
