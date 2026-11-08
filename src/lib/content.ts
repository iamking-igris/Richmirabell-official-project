import { create } from "zustand";
import { persist } from "zustand/middleware";
import { guides as seedGuides, news as seedNews, subjects as seedSubjects, type Subject, type Topic } from "@/data/catalog";
import { withDemoPhysicsTopics } from "@/data/demo";

type Content = {
  subjects: Subject[]; news: typeof seedNews; guides: typeof seedGuides;
  upsertSubject: (subject: Subject) => void; upsertTopic: (subjectId: string, topic: Topic) => void;
  removeTopic: (subjectId: string, topicId: string) => void;
  removeMainTopic: (subjectId: string, mainTopicName: string) => void;
  upsertNews: (item: (typeof seedNews)[number]) => void; removeNews: (id: string) => void; resetContent: () => void;
};
function seedWithDemo(): Subject[] {
  return seedSubjects;
}
export const useContent = create<Content>()(
  persist(
    (set) => ({
      subjects: seedWithDemo(), news: seedNews, guides: seedGuides,
      upsertSubject: (subject) => set((s) => ({ subjects: s.subjects.some(x => x.id === subject.id) ? s.subjects.map(x => x.id === subject.id ? subject : x) : [...s.subjects, subject] })),
      upsertTopic: (subjectId, topic) => set((s) => ({ subjects: s.subjects.map(subject => {
        if (subject.id !== subjectId) return subject;
        const exists = subject.topics.some(t => t.id === topic.id);
        return { ...subject, topics: exists ? subject.topics.map(t => t.id === topic.id ? topic : t) : [...subject.topics, topic] };
      })})),
      removeTopic: (subjectId, topicId) => set((s) => ({ subjects: s.subjects.map(subject => subject.id === subjectId ? { ...subject, topics: subject.topics.filter(t => t.id !== topicId) } : subject) })),
      removeMainTopic: (subjectId, mainTopicName) => set((s) => ({ subjects: s.subjects.map(subject => {
        if (subject.id !== subjectId) return subject;
        const target = mainTopicName.trim().toLowerCase();
        return { ...subject, topics: subject.topics.filter(t => (t.mainTopic ?? "Topics").trim().toLowerCase() !== target) };
      }) })),
      upsertNews: (item) => set((s) => ({ news: s.news.some(x => x.id === item.id) ? s.news.map(x => x.id === item.id ? item : x) : [item, ...s.news] })),
      removeNews: (id) => set((s) => ({ news: s.news.filter(item => item.id !== id) })),
      resetContent: () => set({ subjects: seedWithDemo(), news: seedNews, guides: seedGuides }),
    }),
    {
      name: "richmirabel-content", version: 3,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Content>;
        const savedSubjects = saved.subjects;
        if (!savedSubjects || !Array.isArray(savedSubjects) || savedSubjects.length === 0) {
          return { ...current, ...saved, subjects: seedWithDemo() };
        }
        const existingIds = new Set(savedSubjects.map((s) => s.id));
        const missingSeedSubjects = seedSubjects.filter((s) => !existingIds.has(s.id));
        return {
          ...current,
          ...saved,
          subjects: missingSeedSubjects.length > 0 ? [...savedSubjects, ...missingSeedSubjects] : savedSubjects,
        };
      },
    },
  ),
);
export function publishedSubjects(subjects: Subject[]) {
  return subjects
    .filter((subject) => subject.available !== false)
    .map((subject) => ({ ...subject, topics: subject.topics.filter((topic) => topic.status !== "draft") }));
}
export const AVAILABLE_SUBJECT_IDS = new Set(["physics", "chemistry", "biology", "mathematics"]);
export function availableSubjects(subjects: Subject[]) {
  return publishedSubjects(subjects).filter(s => AVAILABLE_SUBJECT_IDS.has(s.id) && s.topics.length > 0);
}
export const JAMB_OPTIONAL_IDS = ["physics", "chemistry", "biology", "mathematics"] as const;
export const COMING_SOON_SCIENCE = ["Chemistry", "Biology", "Mathematics", "Further Mathematics", "Agricultural Science"] as const;
export function locateTopic(subjects: Subject[], topicId: string) {
  for (const subject of subjects) {
    const topic = subject.topics.find(item => item.id === topicId);
    if (topic) return { subject, topic };
  }
  return null;
}
export function groupByMainTopic(topics: Topic[]) {
  const map = new Map<string, Topic[]>();
  for (const t of topics) {
    const key = t.mainTopic ?? "Topics";
    const list = map.get(key) ?? [];
    list.push(t); map.set(key, list);
  }
  return [...map.entries()].map(([main, items]) => ({ main, items }));
}
export function visibleTopics(topics: Topic[], _demoMode = false) {
  return topics.filter(t => t.origin !== "demo");
}
