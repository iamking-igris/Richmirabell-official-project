import { apiClient } from "../api/client";
import type { StudentProfile, UpdateStudentProfileRequest } from "./students.types";

export class StudentsService {
  public async getProfile(): Promise<StudentProfile> {
    return apiClient.get<StudentProfile>("/students/profile");
  }

  public async updateProfile(data: UpdateStudentProfileRequest): Promise<StudentProfile> {
    return apiClient.put<StudentProfile>("/students/profile", data);
  }
}

export const studentsService = new StudentsService();
