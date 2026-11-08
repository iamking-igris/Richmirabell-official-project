import type { Exam, Pathway } from "@/lib/session";

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  pathway: Pathway | null;
  exams: Exam[];
  jambSubjects: string[];
  selectedSubjects: string[];
  examMonth: string | null;
  trialStart: number | null;
  subscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStudentProfileRequest {
  name?: string;
  exams?: Exam[];
  jambSubjects?: string[];
  selectedSubjects?: string[];
  examMonth?: string | null;
}
