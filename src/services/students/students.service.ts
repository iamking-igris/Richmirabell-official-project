import { studentsApi } from "@/lib/backend";
import type { StudentProfile, UpdateStudentProfileRequest } from "./students.types";

export class StudentsService {
  public getProfile(): Promise<StudentProfile> {
    return studentsApi.getProfile();
  }

  public updateProfile(data: UpdateStudentProfileRequest): Promise<StudentProfile> {
    return studentsApi.saveProfile({
      name: data.name,
      exams: data.exams,
      jamb_subjects: data.jambSubjects,
      selected_subjects: data.selectedSubjects,
      exam_month: data.examMonth,
      onboarding_complete: data.onboardingComplete,
    });
  }
}

export const studentsService = new StudentsService();
