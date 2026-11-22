import type { Topic } from "@/data/catalog";
import { contentApi, studentsApi } from "@/lib/backend";
import { mapTopic } from "@/lib/mappers";
import type { LessonRecord } from "./lessons.types";

export class LessonsService {
  public async getTopic(topicId: string): Promise<Topic> {
    const topic = await contentApi.getTopic(topicId);
    return mapTopic(topic);
  }

  public async recordCompletion(topicId: string, timeSpentSeconds = 0): Promise<LessonRecord> {
    const result = await studentsApi.completeLesson(topicId);
    return {
      topicId,
      completedAt: result.completed_at,
      timeSpentSeconds,
    };
  }
}

export const lessonsService = new LessonsService();
