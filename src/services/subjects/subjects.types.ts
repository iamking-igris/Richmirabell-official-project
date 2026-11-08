import type { Subject } from "@/data/catalog";

export interface SubjectFilter {
  exam?: "JAMB" | "WAEC";
  group?: "sciences" | "arts" | "commercial";
}

export interface SubjectsService {
  getAvailableSubjects(filter?: SubjectFilter): Promise<Subject[]>;
  getSubjectById(id: string): Promise<Subject>;
}
