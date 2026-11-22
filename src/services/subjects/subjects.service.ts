import type { Subject } from "@/data/catalog";
import { contentApi } from "@/lib/backend";
import { mapSubject } from "@/lib/mappers";
import type { SubjectFilter } from "./subjects.types";

export class SubjectsServiceImpl {
  public async getAvailableSubjects(filter?: SubjectFilter): Promise<Subject[]> {
    const summaries = await contentApi.listSubjects();
    const subjects = await Promise.all(
      summaries.map(async (summary) => {
        const topics = await contentApi.listTopics(summary.id, true);
        return mapSubject(summary, topics);
      }),
    );
    return filter?.group ? subjects.filter((subject) => subject.group === filter.group) : subjects;
  }

  public async getSubjectById(id: string): Promise<Subject> {
    const detail = await contentApi.getSubject(id);
    return mapSubject(detail, detail.topics);
  }
}

export const subjectsService = new SubjectsServiceImpl();
