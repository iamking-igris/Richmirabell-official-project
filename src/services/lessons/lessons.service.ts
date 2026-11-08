import { findTopic } from "@/data/catalog";
import type { Topic } from "@/data/catalog";
import { apiClient } from "../api/client";
import type { LessonRecord } from "./lessons.types";

export class LessonsService {
  public async getTopic(topicId: string): Promise<Topic> {
    try {
      return await apiClient.get<Topic>(`/lessons/topics/${topicId}`);
    } catch {
      const match = findTopic(topicId);
      if (!match) throw new Error("Topic not found");
      return match.topic;
    }
  }

  public async recordCompletion(topicId: string, timeSpentSeconds = 0): Promise<LessonRecord> {
    return apiClient.post<LessonRecord>(`/lessons/topics/${topicId}/complete`, { timeSpentSeconds });
  }
}

export const lessonsService = new LessonsService();
