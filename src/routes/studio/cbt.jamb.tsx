import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Calendar } from "lucide-react";

/**
 * Obsolete route: the separate Full JAMB CBT offering was retired.
 *
 * Weekly CBT is now the only full JAMB examination experience. This page
 * exists so old bookmarks / cached links get a clear explanation instead of
 * a blank screen, then forwards the student to the official CBT Hub. It
 * renders no start action and creates no attempt.
 */
export const Route = createFileRoute("/studio/cbt/jamb")({ component: JambCbtRetiredPage });

function JambCbtRetiredPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/studio/cbt", replace: true });
  }, [navigate]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center space-y-4 font-sans">
      <div className="size-12 rounded-full bg-emerald-50 text-[#1A4D2E] flex items-center justify-center mx-auto">
        <Calendar className="size-6" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-stone-900">Full JAMB CBT has retired</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        The separate Full JAMB CBT paper is no longer offered. The official 180-question Weekly
        CBT examination series is the full JAMB examination experience. Taking you to the CBT
        Hub…
      </p>
      <Link
        to="/studio/cbt"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25]"
      >
        Go to the CBT Hub <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
