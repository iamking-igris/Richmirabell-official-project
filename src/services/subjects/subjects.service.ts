import { subjects } from "@/data/catalog";
import type { Subject } from "@/data/catalog";
import { apiClient } from "../api/client";
import type { SubjectFilter } from "./subjects.types";

export class SubjectsServiceImpl {
  public async getAvailableSubjects(filter?: SubjectFilter): Promise<Subject[]> {
    try {
      return await apiClient.get<Subject[]>("/subjects");
    } catch {
      // Fallback contract data using catalog
      let list = subjects.filter((s) => s.available !== false);
      if (filter?.group) {
        list = list.filter((s) => s.group === filter.group);
      }
      return list;
    }
  }

  public async getSubjectById(id: string): Promise<Subject> {
    try {
      return await apiClient.get<Subject>(`/subjects/${id}`);
    } catch {
      const match = subjects.find((s) => s.id === id);
      if (!match) throw new Error("Subject not found");
      return match;
    }
  }
}

export const subjectsService = new SubjectsServiceImpl();
