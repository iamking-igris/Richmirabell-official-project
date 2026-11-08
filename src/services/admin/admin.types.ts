import type { PaymentTransaction } from "../payments/payments.types";

export interface AdminDashboardOverview {
  totalStudents: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingReviews: number;
}

export interface AdminStudentSummary {
  id: string;
  name: string;
  email: string;
  exams: string[];
  subscribed: boolean;
  registeredAt: string;
}
