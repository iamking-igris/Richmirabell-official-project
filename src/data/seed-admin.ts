import type { SubjectGroup } from "@/data/catalog";
import type { PaymentRecord } from "@/lib/payments";

export type StudentRow = {
  id: string;
  name: string;
  pathway: SubjectGroup;
  subjects: string[];
  status: "Trial" | "Paid" | "Expired";
  joinedDaysAgo: number;
  activeDaysAgo: number;
  topics: number;
  avg: number;
};

// Seed arrays are empty by default for production readiness
export const seedStudents: StudentRow[] = [];
export const seedWeakTopics: { topicId: string; avg: number }[] = [];
export const seedRecent: { name: string; topicId: string; score: number; total: number; minutesAgo: number }[] = [];

export function seedPayments(_now = Date.now()): PaymentRecord[] {
  return [];
}
