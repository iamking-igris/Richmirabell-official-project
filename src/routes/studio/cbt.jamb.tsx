import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/studio/cbt/jamb")({ component: JambCbtRetiredPage });

function JambCbtRetiredPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Safely redirect to the official Weekly CBT Hub
    navigate({ to: "/studio/cbt", replace: true });
  }, [navigate]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center space-y-4 font-sans">
      <div className="size-12 rounded-full bg-emerald-50 text-[#1A4D2E] flex items-center justify-center mx-auto">
        <Calendar className="size-6" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-stone-900">Weekly JAMB Examination Series</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        Students sit the official 180-question Weekly JAMB Examination Series exclusively. Redirecting you to the CBT Hub...
      </p>
      <Link
        to="/studio/cbt"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-xs font-bold text-white hover:bg-[#153e25]"
      >
        Go to Weekly CBT Hub <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
