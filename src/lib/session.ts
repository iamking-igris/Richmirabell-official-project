import type { Choice } from "@/data/catalog";
import {
  assessmentsApi,
  authApi,
  billingApi,
  studentsApi,
  type AccessState,
  type ApiUser,
  type Progress,
  type StudentProfile,
  type TokenResponse,
} from "@/lib/backend";
import { mapProgressToAttempts } from "@/lib/mappers";
import { getAuthToken, setAuthToken } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AttemptKind = "topic" | "jamb" | "waec";
export type AttemptItemSnapshot = {
  id: string;
  prompt: string;
  options?: { key: string; text: string }[];
  answer?: string | null;
  explain?: string;
  answerKeyStatus?: "shipped" | "demo" | "missing";
  pick?: string | null;
  correct?: boolean | null;
  status?: string;
  theory?: boolean;
  written?: string;
  modelAnswer?: string;
  markingGuide?: string;
  marks?: number | string | null;
  subjectId?: string | null;
  subject?: string | null;
};
export type Attempt = {
  id: string;
  topicId: string;
  title: string;
  score: number;
  total: number;
  at: number;
  kind: AttemptKind;
  demo?: boolean;
  picks?: Record<string, Choice>;
  written?: Record<string, string>;
  items?: AttemptItemSnapshot[];
  counts?: { total_questions?: number; objective_total?: number; correct?: number; incorrect?: number; skipped?: number; answered?: number; score?: number };
  paperId?: string;
  subjectLabel?: string;
  utmeScore?: number;
  exactUtmeScore?: number;
  subjectScores?: Record<string, any>;
};
export type Exam = "jamb" | "waec";
export type Pathway = "sciences" | "arts" | "commercial";
export type Track = Pathway;

export type SessionStatus = "idle" | "loading" | "authenticated" | "anonymous";

type Session = {
  token: string | null;
  user: ApiUser | null;
  profile: StudentProfile | null;
  access: AccessState | null;
  progress: Progress | null;
  status: SessionStatus;
  error: string | null;

  name: string;
  email: string;
  role: "STUDENT" | "ADMIN" | null;
  trialStart: number | null;
  trialEndsAt: string | null;
  hasAccess: boolean;
  subscribed: boolean;
  attempts: Attempt[];
  exams: Exam[];
  pathway: Pathway | null;
  track: Track | null;
  selectedSubjects: string[];
  subjects: string[];
  jambSubjects: string[];
  examMonth: string | null;
  onboardingComplete: boolean;

  login: (email: string, password: string) => Promise<ApiUser>;
  register: (name: string, email: string, password: string) => Promise<ApiUser>;
  loginWithGoogle: (idToken: string) => Promise<ApiUser>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<StudentProfile | null>;
  refreshProgress: () => Promise<Progress | null>;
  refreshAccess: () => Promise<AccessState | null>;
  refreshAll: () => Promise<void>;
  completeOnboarding: (profile: {
    exams: Exam[];
    jambSubjects: string[];
    examMonth: string | null;
    name?: string;
    track?: Track;
    subjects?: string[];
  }) => Promise<void>;
  updateProfile: (profile: {
    exams: Exam[];
    jambSubjects: string[];
    examMonth: string | null;
    name?: string;
    track?: Track;
    subjects?: string[];
  }) => Promise<void>;
  completeLesson: (topicId: string) => Promise<void>;
  record: (attempt: Omit<Attempt, "id" | "at"> & { id?: string; at?: number }) => string;
  leave: () => void;
  clearError: () => void;
};

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
let restorePromise: Promise<void> | null = null;

function newId() {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function trialStartFromEnd(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const end = Date.parse(trialEndsAt);
  if (!Number.isFinite(end)) return null;
  return end - TWO_DAYS;
}

function stateFromProfile(profile: StudentProfile | null) {
  if (!profile) return {};
  return {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    exams: (profile.exams ?? []) as Exam[],
    pathway: profile.pathway ?? ("sciences" as Pathway),
    track: (profile.pathway ?? "sciences") as Track,
    selectedSubjects: profile.selectedSubjects ?? [],
    subjects: profile.selectedSubjects ?? [],
    jambSubjects: profile.jambSubjects ?? [],
    examMonth: profile.examMonth,
    onboardingComplete: profile.onboardingComplete,
    subscribed: profile.subscribed,
    hasAccess: profile.hasAccess,
    trialEndsAt: profile.trialEndsAt,
    trialStart: trialStartFromEnd(profile.trialEndsAt),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const useSession = create<Session>()(
  persist(
    (set, get) => {
      async function applyToken(response: TokenResponse): Promise<ApiUser> {
        setAuthToken(response.access_token);
        set({
          token: response.access_token,
          user: response.user,
          status: "authenticated",
          error: null,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          onboardingComplete: response.user.onboarding_complete,
        });
        await Promise.allSettled([
          get().refreshProfile(),
          get().refreshProgress(),
          get().refreshAccess(),
        ]);
        return response.user;
      }

      async function clearSession() {
        setAuthToken(null);
        set({
          token: null,
          user: null,
          profile: null,
          access: null,
          progress: null,
          attempts: [],
          status: "anonymous",
          error: null,
          name: "",
          email: "",
          role: null,
          trialStart: null,
          trialEndsAt: null,
          hasAccess: false,
          subscribed: false,
          exams: [],
          pathway: "sciences",
          track: "sciences",
          selectedSubjects: [],
          subjects: [],
          jambSubjects: [],
          examMonth: null,
          onboardingComplete: false,
        });
      }

      return {
        token: getAuthToken(),
        user: null,
        profile: null,
        access: null,
        progress: null,
        status: "idle",
        error: null,

        name: "",
        email: "",
        role: null,
        trialStart: null,
        trialEndsAt: null,
        hasAccess: false,
        subscribed: false,
        attempts: [],
        exams: [],
        pathway: "sciences",
        track: "sciences",
        selectedSubjects: [],
        subjects: [],
        jambSubjects: [],
        examMonth: null,
        onboardingComplete: false,

        login: async (email, password) => {
          set({ status: "loading", error: null });
          try {
            const response = await authApi.login({ email: email.trim().toLowerCase(), password });
            return await applyToken(response);
          } catch (err) {
            set({ status: "anonymous", error: errorMessage(err) });
            throw err;
          }
        },

        register: async (name, email, password) => {
          set({ status: "loading", error: null });
          try {
            const response = await authApi.register({
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password,
            });
            return await applyToken(response);
          } catch (err) {
            set({ status: "anonymous", error: errorMessage(err) });
            throw err;
          }
        },

        loginWithGoogle: async (idToken) => {
          set({ status: "loading", error: null });
          try {
            const response = await authApi.google(idToken);
            return await applyToken(response);
          } catch (err) {
            set({ status: "anonymous", error: errorMessage(err) });
            throw err;
          }
        },

        restore: async () => {
          if (restorePromise) return restorePromise;
          const token = get().token || getAuthToken();
          if (!token) {
            set({ status: "anonymous" });
            return;
          }
          restorePromise = (async () => {
            set({ status: "loading", error: null });
            try {
              const response = await authApi.restore();
              await applyToken(response);
            } catch (err) {
              if (err instanceof ApiError && err.statusCode === 401) {
                await clearSession();
              } else {
                set({
                  status: "idle",
                  error: errorMessage(err),
                });
              }
            } finally {
              restorePromise = null;
            }
          })();
          return restorePromise;
        },

        logout: async () => {
          try {
            await authApi.logout();
          } catch {
            // The local session is cleared even if the server session already expired.
          }
          await clearSession();
        },

        logoutAll: async () => {
          try {
            await authApi.logoutAll();
          } catch {
            // Clearing locally is still the safe outcome.
          }
          await clearSession();
        },

        refreshProfile: async () => {
          if (!get().token) return null;
          try {
            const profile = await studentsApi.getProfile();
            set({ profile, ...stateFromProfile(profile) });
            return profile;
          } catch (err) {
            if (err instanceof ApiError && err.statusCode === 401) {
              await clearSession();
            } else {
              set({ error: errorMessage(err) });
            }
            return null;
          }
        },

        refreshProgress: async () => {
          if (!get().token) return null;
          try {
            const progress = await studentsApi.getProgress();
            set({ progress, attempts: mapProgressToAttempts(progress) });
            return progress;
          } catch (err) {
            if (err instanceof ApiError && err.statusCode === 401) {
              await clearSession();
            } else {
              set({ error: errorMessage(err) });
            }
            return null;
          }
        },

        refreshAccess: async () => {
          if (!get().token) return null;
          try {
            const access = await billingApi.access();
            set({
              access,
              hasAccess: access.has_access,
              subscribed: Boolean(access.subscription),
              trialEndsAt: access.trial_ends_at,
              trialStart: trialStartFromEnd(access.trial_ends_at),
            });
            return access;
          } catch (err) {
            if (err instanceof ApiError && err.statusCode === 401) {
              await clearSession();
            } else {
              set({ error: errorMessage(err) });
            }
            return null;
          }
        },

        refreshAll: async () => {
          await Promise.allSettled([
            get().refreshProfile(),
            get().refreshProgress(),
            get().refreshAccess(),
          ]);
        },

        completeOnboarding: async ({ exams, jambSubjects, examMonth, name, track, subjects }) => {
          const selected: string[] = (subjects && subjects.length > 0 ? subjects : ["english", ...jambSubjects])
            .filter(Boolean)
            .slice(0, 4);
          const finalSubjects = [...new Set(["english", ...selected.filter((subject: string) => subject !== "english")])].slice(0, 4);
          const profile = await studentsApi.saveProfile({
            name,
            exams,
            jamb_subjects: jambSubjects,
            selected_subjects: finalSubjects,
            exam_month: examMonth,
            onboarding_complete: true,
          });
          const nextPathway = track ?? (profile.pathway ?? "sciences");
          set({
            profile,
            ...stateFromProfile(profile),
            pathway: nextPathway,
            track: nextPathway,
            selectedSubjects: finalSubjects,
            subjects: finalSubjects,
            jambSubjects,
            examMonth,
            onboardingComplete: true,
          });
          await get().refreshAccess();
        },

        updateProfile: async ({ exams, jambSubjects, examMonth, name, track, subjects }) => {
          const selected: string[] = (subjects && subjects.length > 0 ? subjects : ["english", ...jambSubjects])
            .filter(Boolean)
            .slice(0, 4);
          const finalSubjects = [...new Set(["english", ...selected.filter((subject: string) => subject !== "english")])].slice(0, 4);
          const profile = await studentsApi.saveProfile({
            name,
            exams,
            jamb_subjects: jambSubjects,
            selected_subjects: finalSubjects,
            exam_month: examMonth,
          });
          const nextPathway = track ?? (profile.pathway ?? "sciences");
          set({
            profile,
            ...stateFromProfile(profile),
            pathway: nextPathway,
            track: nextPathway,
            selectedSubjects: finalSubjects,
            subjects: finalSubjects,
            jambSubjects,
            examMonth,
          });
        },

        completeLesson: async (topicId) => {
          await studentsApi.completeLesson(topicId);
          await get().refreshProgress();
        },

        record: (attempt) => {
          const id = attempt.id ?? newId();
          const payload = {
            topic_id: attempt.topicId || null,
            title: attempt.title,
            kind: attempt.kind,
            picks: attempt.picks ?? {},
            written: attempt.written ?? {},
            items: attempt.items ?? [],
            total: attempt.total,
            subject_label: attempt.subjectLabel ?? null,
          };
          void assessmentsApi
            .syncAttempt(payload)
            .then(() => get().refreshProgress())
            .catch(() => undefined);
          return id;
        },

        leave: () => {
          void get().logout();
        },

        clearError: () => set({ error: null }),
      };
    },
    {
      name: "richmirabel-auth",
      version: 1,
      partialize: (state) => ({ token: state.token }),
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
    if (!prev || attempt.score / Math.max(attempt.total, 1) > prev.score / Math.max(prev.total, 1)) {
      map.set(attempt.topicId, attempt);
    }
  }
  return map;
}

export function findAttempt(attempts: Attempt[], id: string) {
  return attempts.find((attempt) => attempt.id === id) ?? null;
}
