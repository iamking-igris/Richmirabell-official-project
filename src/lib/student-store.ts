import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSession, type Attempt } from "@/lib/session";
import { getAttemptUtmeResult } from "@/lib/utme-scoring";

export type StudentAccessPlan = "Trial" | "Paid" | "Manual" | "Expired";
export type StudentAccountStatus = "Active" | "Suspended";

export type StudentQuizAttempt = {
  id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  dateAttempted: string; // ISO or YYYY-MM-DD
  score: number;
  total: number;
  percentage: number;
  status: "Completed" | "In Progress";
  durationSeconds?: number;
};

export type StudentWaecAttempt = {
  id: string;
  subject: string;
  year: number | string;
  questionsAttempted: number;
  score: number;
  percentage: number;
  dateCompleted: string;
  durationMinutes?: number;
};

export type StudentCbtSubjectScore = {
  subject: string;
  score: number;
  total: number;
  percentage: number;
  answered: number;
};

export type StudentCbtQuestionReview = {
  id: string;
  prompt: string;
  subject: string;
  selectedKey?: string;
  correctKey: string;
  isCorrect: boolean;
  explanation?: string;
  options: { key: string; text: string }[];
};

export type StudentCbtAttempt = {
  id: string;
  examId: string;
  examName: string;
  examType: "weekly_jamb" | "full_jamb_mock";
  weekOrPeriod?: string;
  dateAttempted: string; // ISO or YYYY-MM-DD
  startTime: string;
  submissionTime: string;
  durationMinutes: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  rawScore: number;
  rawTotal: number;
  utmeScore: number; // /400
  percentage: number;
  status: "Completed" | "In Progress" | "Submitted" | "Timed Out";
  subjectScores: Record<string, StudentCbtSubjectScore>;
  questions?: StudentCbtQuestionReview[];
};

export type StudentRecord = {
  id: string; // e.g. "u_01"
  studentIdNumber: string; // e.g. "STU-2026-001"
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: StudentAccountStatus;
  accessPlan: StudentAccessPlan;
  registeredDate: string; // "2026-10-02"
  lastActive: string; // "2026-10-24"
  jambSubjects: string[];
  isArchived?: boolean;
  subscriptionDetails: {
    planName: string;
    expiryDate?: string;
    trialEndDate?: string;
    manualGrantReason?: string;
    autoRenew?: boolean;
  };
  quizAttempts: StudentQuizAttempt[];
  waecAttempts: StudentWaecAttempt[];
  cbtAttempts: StudentCbtAttempt[];
  lessonsCompletedCount: number;
  studyDaysCount: number;
};

export type StudentOverviewStats = {
  total: number;
  active: number;
  suspended: number;
  trial: number;
  paid: number;
  manual: number;
  expired: number;
  newlyRegistered: number;
};

export const ALL_AVAILABLE_JAMB_SUBJECTS = [
  "English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature",
  "Accounting",
] as const;

export const INITIAL_DEMO_STUDENTS: StudentRecord[] = [];

export function calculateStudentOverviewStats(students: StudentRecord[]): StudentOverviewStats {
  const nonArchived = students.filter((s) => !s.isArchived);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    total: nonArchived.length,
    active: nonArchived.filter((s) => s.status === "Active").length,
    suspended: nonArchived.filter((s) => s.status === "Suspended").length,
    trial: nonArchived.filter((s) => s.accessPlan === "Trial").length,
    paid: nonArchived.filter((s) => s.accessPlan === "Paid").length,
    manual: nonArchived.filter((s) => s.accessPlan === "Manual").length,
    expired: nonArchived.filter((s) => s.accessPlan === "Expired").length,
    newlyRegistered: nonArchived.filter((s) => {
      const reg = new Date(s.registeredDate);
      return !isNaN(reg.getTime()) && reg >= thirtyDaysAgo;
    }).length,
  };
}

export function filterAndSortStudents(
  students: StudentRecord[],
  options: {
    query?: string;
    filter?: "All" | "Active" | "Suspended" | "Trial" | "Paid" | "Manual" | "Expired" | "Archived";
    subject?: string;
    sortBy?: "newest" | "oldest" | "name_asc" | "name_desc" | "recently_active";
  }
): StudentRecord[] {
  const { query = "", filter = "All", subject = "All", sortBy = "newest" } = options;
  const q = query.trim().toLowerCase();

  return students
    .filter((s) => {
      // Archive handling
      if (filter === "Archived") {
        if (!s.isArchived) return false;
      } else {
        if (s.isArchived) return false;
      }

      // Filter by status or access
      if (filter === "Active" && s.status !== "Active") return false;
      if (filter === "Suspended" && s.status !== "Suspended") return false;
      if (filter === "Trial" && s.accessPlan !== "Trial") return false;
      if (filter === "Paid" && s.accessPlan !== "Paid") return false;
      if (filter === "Manual" && s.accessPlan !== "Manual") return false;
      if (filter === "Expired" && s.accessPlan !== "Expired") return false;

      // Filter by subject
      if (subject !== "All") {
        const hasSubj = s.jambSubjects.some(
          (sub) => sub.toLowerCase() === subject.toLowerCase()
        );
        if (!hasSubj) return false;
      }

      // Search query (name, email, student ID, subjects)
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesId = s.studentIdNumber.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
        const matchesSubj = s.jambSubjects.some((sub) => sub.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesId && !matchesSubj) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.registeredDate).getTime() - new Date(b.registeredDate).getTime();
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "recently_active") {
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      }
      return 0;
    });
}

type StudentStoreState = {
  students: StudentRecord[];

  // Actions
  getStudentById: (id: string) => StudentRecord | undefined;
  suspendStudent: (id: string) => void;
  restoreStudent: (id: string) => void;
  archiveStudent: (id: string) => void;
  unarchiveStudent: (id: string) => void;
  deleteStudent: (id: string) => void;
  updateStudentProfile: (
    id: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      jambSubjects?: string[];
    }
  ) => { success: boolean; error?: string };
  updateStudentAccess: (
    id: string,
    accessPlan: StudentAccessPlan,
    details?: { planName?: string; expiryDate?: string; manualGrantReason?: string }
  ) => void;
  addStudentAttemptFromSession: (studentId: string, attempt: Attempt) => void;
};

export const useStudentStore = create<StudentStoreState>()(
  persist(
    (set, get) => ({
      students: [],

      getStudentById: (id: string) => {
        return get().students.find((s) => s.id === id);
      },

      suspendStudent: (id: string) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, status: "Suspended" as const, lastActive: new Date().toISOString().slice(0, 10) } : s
          ),
        }));
      },

      restoreStudent: (id: string) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, status: "Active" as const, lastActive: new Date().toISOString().slice(0, 10) } : s
          ),
        }));
      },

      archiveStudent: (id: string) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, isArchived: true } : s
          ),
        }));
      },

      unarchiveStudent: (id: string) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, isArchived: false } : s
          ),
        }));
      },

      deleteStudent: (id: string) => {
        // Safe delete (hard delete or soft depending on intent, remove from list)
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        }));
      },

      updateStudentProfile: (id, updates) => {
        const student = get().students.find((s) => s.id === id);
        if (!student) return { success: false, error: "Student not found" };

        if (updates.name != null && !updates.name.trim()) {
          return { success: false, error: "Student name cannot be empty." };
        }

        if (updates.email != null) {
          const email = updates.email.trim();
          if (!email || !email.includes("@")) {
            return { success: false, error: "Please provide a valid email address." };
          }
          const duplicate = get().students.find((s) => s.id !== id && s.email.toLowerCase() === email.toLowerCase());
          if (duplicate) {
            return { success: false, error: "Another student already uses this email address." };
          }
        }

        if (updates.jambSubjects != null) {
          if (!Array.isArray(updates.jambSubjects) || updates.jambSubjects.length !== 4) {
            return { success: false, error: "JAMB requires exactly 4 subjects." };
          }
          const hasEnglish = updates.jambSubjects.some((s) => s.toLowerCase() === "english");
          if (!hasEnglish) {
            return { success: false, error: "English Language is compulsory for all JAMB candidates." };
          }
        }

        set((state) => ({
          students: state.students.map((s) => {
            if (s.id !== id) return s;
            return {
              ...s,
              name: updates.name ? updates.name.trim() : s.name,
              email: updates.email ? updates.email.trim() : s.email,
              phone: updates.phone !== undefined ? updates.phone.trim() : s.phone,
              jambSubjects: updates.jambSubjects ? updates.jambSubjects : s.jambSubjects,
              lastActive: new Date().toISOString().slice(0, 10),
            };
          }),
        }));

        // If editing the active student (e.g. u_01 or matching email), sync with session store
        try {
          const currentSession = useSession.getState();
          if (currentSession.email === student.email || student.id === "u_01") {
            const newName = updates.name ? updates.name.trim() : student.name;
            const newEmail = updates.email ? updates.email.trim() : student.email;
            if (newName !== currentSession.name || (newEmail && newEmail !== currentSession.email)) {
              currentSession.enter(newName, newEmail);
            }
            if (updates.jambSubjects) {
              const electives = updates.jambSubjects
                .filter((s) => s.toLowerCase() !== "english")
                .map((s) => s.toLowerCase());
              currentSession.updateProfile({
                exams: currentSession.exams,
                jambSubjects: electives,
                examMonth: currentSession.examMonth,
              });
            }
          }
        } catch {
          // ignore in isolated test environments
        }

        return { success: true };
      },

      updateStudentAccess: (id, accessPlan, details) => {
        set((state) => ({
          students: state.students.map((s) => {
            if (s.id !== id) return s;
            return {
              ...s,
              accessPlan,
              subscriptionDetails: {
                ...s.subscriptionDetails,
                planName: details?.planName || s.subscriptionDetails.planName,
                expiryDate: details?.expiryDate || s.subscriptionDetails.expiryDate,
                manualGrantReason: details?.manualGrantReason || s.subscriptionDetails.manualGrantReason,
              },
            };
          }),
        }));
      },

      addStudentAttemptFromSession: (studentId, attempt) => {
        const student = get().students.find((s) => s.id === studentId);
        if (!student) return;

        if (attempt.kind === "jamb") {
          const utmeRes = getAttemptUtmeResult(attempt);
          const newCbtAttempt: StudentCbtAttempt = {
            id: attempt.id,
            examId: attempt.paperId || attempt.topicId,
            examName: attempt.title,
            examType: "weekly_jamb",
            weekOrPeriod: "Latest Submission",
            dateAttempted: new Date(attempt.at).toISOString().slice(0, 10),
            startTime: new Date(attempt.at - (attempt.total > 100 ? 110 : 30) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            submissionTime: new Date(attempt.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            durationMinutes: attempt.total > 100 ? 110 : 30,
            totalQuestions: attempt.total,
            correctCount: attempt.score,
            incorrectCount: attempt.total - attempt.score,
            unansweredCount: 0,
            rawScore: attempt.score,
            rawTotal: attempt.total,
            utmeScore: utmeRes.utmeScore,
            percentage: Math.round((attempt.score / Math.max(1, attempt.total)) * 100),
            status: "Completed",
            subjectScores: {},
          };

          if (utmeRes.subjectBreakdown) {
            Object.entries(utmeRes.subjectBreakdown).forEach(([subj, data]: [string, any]) => {
              newCbtAttempt.subjectScores[subj] = {
                subject: subj,
                score: data.score,
                total: data.total,
                percentage: data.percentage,
                answered: data.answered,
              };
            });
          }

          set((state) => ({
            students: state.students.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    cbtAttempts: [newCbtAttempt, ...s.cbtAttempts.filter((a) => a.id !== attempt.id)],
                    lastActive: new Date().toISOString().slice(0, 10),
                  }
                : s
            ),
          }));
        } else if (attempt.kind === "waec") {
          const newWaecAttempt: StudentWaecAttempt = {
            id: attempt.id,
            subject: attempt.subjectLabel || "WAEC Practice",
            year: 2024,
            questionsAttempted: attempt.total,
            score: attempt.score,
            percentage: Math.round((attempt.score / Math.max(1, attempt.total)) * 100),
            dateCompleted: new Date(attempt.at).toISOString().slice(0, 10),
          };

          set((state) => ({
            students: state.students.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    waecAttempts: [newWaecAttempt, ...s.waecAttempts.filter((a) => a.id !== attempt.id)],
                    lastActive: new Date().toISOString().slice(0, 10),
                  }
                : s
            ),
          }));
        } else {
          // Topic Quiz
          const newQuizAttempt: StudentQuizAttempt = {
            id: attempt.id,
            subject: attempt.subjectLabel || "General",
            topic: attempt.title,
            dateAttempted: new Date(attempt.at).toISOString().slice(0, 10),
            score: attempt.score,
            total: attempt.total,
            percentage: Math.round((attempt.score / Math.max(1, attempt.total)) * 100),
            status: "Completed",
          };

          set((state) => ({
            students: state.students.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    quizAttempts: [newQuizAttempt, ...s.quizAttempts.filter((a) => a.id !== attempt.id)],
                    lastActive: new Date().toISOString().slice(0, 10),
                  }
                : s
            ),
          }));
        }
      },
    }),
    {
      name: "richmirabel-admin-students",
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<StudentStoreState>;
        const rawStudents = state.students ?? [];
        // Filter out known synthetic demo accounts
        const cleaned = rawStudents.filter((s) => !["u_01", "u_02", "u_03", "u_04", "u_05"].includes(s.id) && !s.email.endsWith("@example.com"));
        return { ...state, students: cleaned };
      },
    }
  )
);
