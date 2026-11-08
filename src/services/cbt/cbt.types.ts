import type { Choice } from "@/data/catalog";
import type { Attempt } from "@/lib/session";

export interface StartCbtRequest {
  exam: "jamb" | "waec";
  subjects: string[];
}

export interface SubmitCbtRequest {
  exam: "jamb" | "waec";
  picks: Record<string, Choice>;
  timeSpentSeconds: number;
}
