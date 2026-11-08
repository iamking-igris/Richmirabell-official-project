import type { Topic } from "@/data/catalog";

export interface LessonRecord {
  topicId: string;
  completedAt: string;
  timeSpentSeconds: number;
}
