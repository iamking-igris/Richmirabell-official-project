import type { StudentProfile } from "@/lib/backend";

export type { StudentProfile };

export interface UpdateStudentProfileRequest {
  name?: string;
  exams?: string[];
  jambSubjects?: string[];
  selectedSubjects?: string[];
  examMonth?: string | null;
  onboardingComplete?: boolean;
}
