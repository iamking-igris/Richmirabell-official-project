import { adminApi } from "@/lib/backend";
import type { AdminDashboardOverview, AdminStudentSummary } from "./admin.types";

export class AdminService {
  public getOverview(): Promise<AdminDashboardOverview> {
    return adminApi.overview() as unknown as Promise<AdminDashboardOverview>;
  }

  public getStudents(): Promise<AdminStudentSummary[]> {
    return adminApi.students() as unknown as Promise<AdminStudentSummary[]>;
  }
}

export const adminService = new AdminService();
