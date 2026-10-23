import type { Choice } from "@/data/catalog";
import type { PaymentRecord } from "@/lib/payments";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AttemptKind = "topic" | "jamb" | "waec";
export type AttemptItemSnapshot = {
  id: string; prompt: string; options?: { key: Choice; text: string }[];
  answer?: Choice; explain?: string; answerKeyStatus?: "shipped" | "demo" | "missing";
  pick?: Choice; theory?: boolean; written?: string; modelAnswer?: string;
};
export type Attempt = {
  id: string; topicId: string; title: string; score: number; total: number; at: number;
  kind: AttemptKind; demo?: boolean; picks?: Record<string, Choice>; written?: Record<string, string>;
  items?: AttemptItemSnapshot[]; paperId?: string; subjectLabel?: string;
};
export type Exam = "jamb" | "waec";
export type Pathway = "sciences" | "arts" | "commercial";

type Session = {
  name: string; email: string; trialStart: number | null; subscribed: boolean;
  attempts: Attempt[]; payments: PaymentRecord[]; exams: Exam[]; pathway: Pathway | null;
  selectedSubjects: string[]; jambSubjects: string[]; examMonth: string | null;
  onboardingComplete: boolean; demoMode: boolean;
  enter: (name: string, email?: string) => void;
  completeOnboarding: (profile: { exams: Exam[]; jambSubjects: string[]; examMonth: string | null }) => void;
  updateProfile: (profile: { exams: Exam[]; jambSubjects: string[]; examMonth: string | null }) => void;
  subscribe: () => void; resetTrial: () => void;
  record: (attempt: Omit<Attempt, "id" | "at"> & { id?: string; at?: number }) => string;
  addPayment: (payment: PaymentRecord) => void; leave: () => void;
  setDemoMode: (on: boolean) => void; clearDemoAttempts: () => void; clearAllAttempts: () => void;
};

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
function newId() { return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

export const useSession = create<Session>()(
  persist(
    (set, get) => ({
      name: "", email: "", trialStart: null, subscribed: false, attempts: [], payments: [],
      exams: [], pathway: "sciences", selectedSubjects: ["physics"], jambSubjects: [], examMonth: null,
      onboardingComplete: false, demoMode: true,
      enter: (name, email = "") => set({ name: name.trim(), email: email.trim() }),
      completeOnboarding: ({ exams, jambSubjects, examMonth }) => set((s) => ({
        exams, pathway: "sciences",
        selectedSubjects: exams.includes("jamb") ? ["english", ...jambSubjects] : ["physics"],
        jambSubjects: exams.includes("jamb") ? jambSubjects : [], examMonth, onboardingComplete: true,
        trialStart: s.trialStart ?? Date.now(),
      })),
      updateProfile: ({ exams, jambSubjects, examMonth }) => set({
        exams, selectedSubjects: exams.includes("jamb") ? ["english", ...jambSubjects] : ["physics"],
        jambSubjects: exams.includes("jamb") ? jambSubjects : [], examMonth,
      }),
      subscribe: () => set({ subscribed: true }),
      resetTrial: () => set({ trialStart: Date.now() - TWO_DAYS - 1000, subscribed: false }),
      record: (attempt) => {
        const id = attempt.id ?? newId();
        const at = attempt.at ?? Date.now();
        if (get().attempts.find(a => a.id === id)) return id;
        set((s) => ({ attempts: [{ ...attempt, id, at, kind: attempt.kind ?? "topic" }, ...s.attempts].slice(0, 120) }));
        return id;
      },
      addPayment: (payment) => set((s) => ({ payments: [payment, ...s.payments] })),
      leave: () => set({ name: "", email: "", trialStart: null, subscribed: false, attempts: [], payments: [], exams: [], pathway: "sciences", selectedSubjects: ["physics"], jambSubjects: [], examMonth: null, onboardingComplete: false }),
      setDemoMode: (on) => set({ demoMode: on }),
      clearDemoAttempts: () => set((s) => ({ attempts: s.attempts.filter(a => !a.demo) })),
      clearAllAttempts: () => set({ attempts: [] }),
    }),
    {
      name: "richmirabel-session", version: 5,
      migrate: (state) => {
        const s = state as Partial<Session> & { attempts?: Array<Partial<Attempt> & { topicId: string; score: number; total: number; at: number }> };
        const attempts = (s.attempts ?? []).map((a) => ({
          id: a.id ?? `legacy_${a.topicId}_${a.at}`, topicId: a.topicId, title: a.title ?? a.topicId,
          score: a.score, total: a.total, at: a.at, kind: (a.kind as AttemptKind) ?? "topic",
          demo: a.demo, picks: a.picks, written: a.written, items: a.items, paperId: a.paperId, subjectLabel: a.subjectLabel,
        }));
        return { ...s, exams: s.exams ?? [], jambSubjects: s.jambSubjects ?? [], pathway: "sciences" as const, demoMode: s.demoMode ?? true, attempts };
      },
    },
  ),
);

export function trialLeft(start: number | null, subscribed: boolean) {
  if (subscribed) return { active: true, label: "Full access" };
  if (!start) return { active: true, label: "Trial not started" };
  const left = TWO_DAYS - (Date.now() - start);
  if (left <= 0) return { active: false, label: "Trial ended" };
  const hours = Math.floor(left / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return { active: true, label: days > 0 ? `${days}d ${rem}h left` : `${rem}h left` };
}
export function bestByTopic(attempts: Attempt[]) {
  const map = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (attempt.kind && attempt.kind !== "topic") continue;
    const prev = map.get(attempt.topicId);
    if (!prev || attempt.score / Math.max(attempt.total, 1) > prev.score / Math.max(prev.total, 1)) map.set(attempt.topicId, attempt);
  }
  return map;
}
export function findAttempt(attempts: Attempt[], id: string) { return attempts.find(a => a.id === id) ?? null; }
