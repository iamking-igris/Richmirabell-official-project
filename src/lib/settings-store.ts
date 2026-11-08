import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GeneralSettings {
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface AcademicSettings {
  compulsorySubject: string; // "English Language"
  requiredSubjectCount: number; // 4 (English + 3 electives)
  cbtEnglishQuestions: number; // 60
  cbtOtherSubjectQuestions: number; // 40
  cbtExamDurationMinutes: number; // 120
  allowPostExamReview: boolean;
  showDetailedExplanations: boolean;
  instantQuizFeedback: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  activeSyllabusCohort: string; // "2025/2026 Academic Session"
}

export interface NotificationSettings {
  // Student Notifications
  notifyExpiry7Days: boolean;
  notifyExpiry3Days: boolean;
  notifyExpiry1Day: boolean;
  notifyOnExpiryDay: boolean;
  notifyPaymentReceipt: boolean;
  notifyWeeklyExamAvailable: boolean;
  notifyContentUpdates: boolean;
  // Admin Notifications
  notifyAdminNewStudent: boolean;
  notifyAdminPaymentSuccess: boolean;
  notifyAdminFailedPayment: boolean;
  notifyAdminDailyDigest: boolean;
}

export interface AiPreferences {
  defaultModel: string;
  ocrAutoDetectFormulas: boolean;
  ocrDefaultLatex: boolean;
  ocrQualityMode: "standard" | "high_precision";
  temperature: number;
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  lastLogin: string;
}

export interface SettingsState {
  general: GeneralSettings;
  academic: AcademicSettings;
  notifications: NotificationSettings;
  ai: AiPreferences;
  adminProfile: AdminProfile;

  // Actions
  updateGeneralSettings: (partial: Partial<GeneralSettings>) => void;
  updateAcademicSettings: (partial: Partial<AcademicSettings>) => void;
  updateNotificationSettings: (partial: Partial<NotificationSettings>) => void;
  updateAiPreferences: (partial: Partial<AiPreferences>) => void;
  updateAdminProfile: (partial: Partial<AdminProfile>) => void;
  resetSettingsToDefault: () => void;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  platformName: "Richmirabel JAMB/WAEC CBT Platform",
  platformTagline: "Structured Theory Notes, Syllabus Mastery & Full UTME CBT Hall Simulations",
  supportEmail: "support@richmirabel.ng",
  supportPhone: "+234 803 123 4567",
  websiteUrl: "https://richmirabel.ng",
  timezone: "Africa/Lagos (GMT+1)",
  currency: "NGN (₦)",
  dateFormat: "DD/MM/YYYY",
  maintenanceMode: false,
  maintenanceMessage: "Richmirabel is temporarily undergoing scheduled maintenance to upgrade CBT exam servers. We will be back online shortly.",
};

export const DEFAULT_ACADEMIC_SETTINGS: AcademicSettings = {
  compulsorySubject: "English Language",
  requiredSubjectCount: 4,
  cbtEnglishQuestions: 60,
  cbtOtherSubjectQuestions: 40,
  cbtExamDurationMinutes: 120,
  allowPostExamReview: true,
  showDetailedExplanations: true,
  instantQuizFeedback: true,
  shuffleQuestions: true,
  shuffleOptions: true,
  activeSyllabusCohort: "2025/2026 Academic Session",
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notifyExpiry7Days: true,
  notifyExpiry3Days: true,
  notifyExpiry1Day: true,
  notifyOnExpiryDay: true,
  notifyPaymentReceipt: true,
  notifyWeeklyExamAvailable: true,
  notifyContentUpdates: false,
  notifyAdminNewStudent: true,
  notifyAdminPaymentSuccess: true,
  notifyAdminFailedPayment: true,
  notifyAdminDailyDigest: false,
};

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  defaultModel: "gemini-2.5-flash",
  ocrAutoDetectFormulas: true,
  ocrDefaultLatex: true,
  ocrQualityMode: "high_precision",
  temperature: 0.2,
};

export const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  name: "Baba Ne",
  email: "admin@richmirabel.ng",
  role: "Super Administrator",
  phone: "+234 802 000 0000",
  department: "Academic Direction & Platform Operations",
  lastLogin: new Date().toISOString(),
};

export function calculateTotalCbtQuestions(academic: AcademicSettings): number {
  // 1 compulsory English + 3 other subjects
  const otherCount = Math.max(0, academic.requiredSubjectCount - 1);
  return academic.cbtEnglishQuestions + otherCount * academic.cbtOtherSubjectQuestions;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      general: { ...DEFAULT_GENERAL_SETTINGS },
      academic: { ...DEFAULT_ACADEMIC_SETTINGS },
      notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
      ai: { ...DEFAULT_AI_PREFERENCES },
      adminProfile: { ...DEFAULT_ADMIN_PROFILE },

      updateGeneralSettings: (partial) =>
        set((state) => ({ general: { ...state.general, ...partial } })),

      updateAcademicSettings: (partial) =>
        set((state) => ({ academic: { ...state.academic, ...partial } })),

      updateNotificationSettings: (partial) =>
        set((state) => ({ notifications: { ...state.notifications, ...partial } })),

      updateAiPreferences: (partial) =>
        set((state) => ({ ai: { ...state.ai, ...partial } })),

      updateAdminProfile: (partial) =>
        set((state) => ({ adminProfile: { ...state.adminProfile, ...partial } })),

      resetSettingsToDefault: () =>
        set({
          general: { ...DEFAULT_GENERAL_SETTINGS },
          academic: { ...DEFAULT_ACADEMIC_SETTINGS },
          notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
          ai: { ...DEFAULT_AI_PREFERENCES },
          adminProfile: { ...DEFAULT_ADMIN_PROFILE },
        }),
    }),
    {
      name: "richmirabel-admin-settings",
      version: 1,
    }
  )
);
