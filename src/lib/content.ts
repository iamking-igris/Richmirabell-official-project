import type { Guide, NewsItem, Subject, Topic } from "@/data/catalog";
import { contentApi } from "@/lib/backend";
import { mapSubject } from "@/lib/mappers";
import { useSession } from "@/lib/session";
import { create } from "zustand";

type Content = {
  subjects: Subject[];
  news: NewsItem[];
  guides: Guide[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  refresh: (options?: { includeDrafts?: boolean }) => Promise<void>;
  upsertSubject: (subject: Subject) => void;
  upsertTopic: (subjectId: string, topic: Topic) => void;
  removeTopic: (subjectId: string, topicId: string) => void;
  removeMainTopic: (subjectId: string, mainTopicName: string) => void;
  upsertNews: (item: NewsItem) => void;
  removeNews: (id: string) => void;
  resetContent: () => Promise<void>;
};

function message(err: unknown) {
  return err instanceof Error ? err.message : "Could not load content from the backend.";
}

export const useContent = create<Content>()((set, get) => ({
  subjects: [],
  news: [],
  guides: [],
  loading: false,
  loaded: false,
  error: null,

  refresh: async (options) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const isAdmin = useSession.getState().user?.role === "ADMIN";
      const includeDrafts = options?.includeDrafts ?? isAdmin;
      const summaries = await contentApi.listSubjects();
      const subjects = await Promise.all(
        summaries.map(async (summary) => {
          const topics = await contentApi.listTopics(summary.id, !includeDrafts);
          return mapSubject(summary, topics);
        }),
      );
      set({ subjects, loading: false, loaded: true, error: null });
    } catch (err) {
      set({ loading: false, error: message(err) });
      throw err;
    }
  },

  upsertSubject: (subject) =>
    set((state) => ({
      subjects: state.subjects.some((item) => item.id === subject.id)
        ? state.subjects.map((item) => (item.id === subject.id ? subject : item))
        : [...state.subjects, subject],
    })),

  upsertTopic: (subjectId, topic) =>
    set((state) => ({
      subjects: state.subjects.map((subject) => {
        if (subject.id !== subjectId) return subject;
        const exists = subject.topics.some((item) => item.id === topic.id);
        return {
          ...subject,
          topics: exists
            ? subject.topics.map((item) => (item.id === topic.id ? topic : item))
            : [...subject.topics, topic],
        };
      }),
    })),

  removeTopic: (subjectId, topicId) =>
    set((state) => ({
      subjects: state.subjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, topics: subject.topics.filter((topic) => topic.id !== topicId) }
          : subject,
      ),
    })),

  removeMainTopic: (subjectId, mainTopicName) =>
    set((state) => ({
      subjects: state.subjects.map((subject) => {
        if (subject.id !== subjectId) return subject;
        const target = mainTopicName.trim().toLowerCase();
        return {
          ...subject,
          topics: subject.topics.filter(
            (topic) => (topic.mainTopic ?? "Topics").trim().toLowerCase() !== target,
          ),
        };
      }),
    })),

  upsertNews: (item) =>
    set((state) => ({
      news: state.news.some((entry) => entry.id === item.id)
        ? state.news.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...state.news],
    })),

  removeNews: (id) => set((state) => ({ news: state.news.filter((item) => item.id !== id) })),

  resetContent: async () => {
    await get().refresh();
  },
}));

export function publishedSubjects(subjects: Subject[]) {
  return subjects
    .filter((subject) => subject.available !== false)
    .map((subject) => ({
      ...subject,
      topics: subject.topics.filter((topic) => topic.status !== "draft" && topic.origin !== "demo"),
    }));
}

export const AVAILABLE_SUBJECT_IDS = new Set([
  "english",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
]);

export function availableSubjects(subjects: Subject[]) {
  return publishedSubjects(subjects).filter((subject) => AVAILABLE_SUBJECT_IDS.has(subject.id));
}

export const JAMB_OPTIONAL_IDS = ["physics", "chemistry", "biology", "mathematics"] as const;
export const COMING_SOON_SCIENCE = [] as const;

export function locateTopic(subjects: Subject[], topicId: string) {
  for (const subject of subjects) {
    const topic = subject.topics.find((item) => item.id === topicId);
    if (topic) return { subject, topic };
  }
  return null;
}

export function groupByMainTopic(topics: Topic[]) {
  const map = new Map<string, Topic[]>();
  for (const topic of topics) {
    const key = topic.mainTopic ?? "Topics";
    const list = map.get(key) ?? [];
    list.push(topic);
    map.set(key, list);
  }
  return [...map.entries()].map(([main, items]) => ({ main, items }));
}

export function visibleTopics(topics: Topic[], _demoMode = false) {
  return topics.filter((topic) => topic.origin !== "demo");
}
