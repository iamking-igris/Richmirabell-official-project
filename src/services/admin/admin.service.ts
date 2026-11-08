import { apiClient } from "../api/client";
import type { AdminDashboardOverview, AdminStudentSummary } from "./admin.types";

export class AdminService {
  public async getOverview(): Promise<AdminDashboardOverview> {
    return apiClient.get<AdminDashboardOverview>("/admin/overview");
  }

  public async getStudents(): Promise<AdminStudentSummary[]> {
    return apiClient.get<AdminStudentSummary[]>("/admin/students");
  }
}

export const adminService = new AdminService();
