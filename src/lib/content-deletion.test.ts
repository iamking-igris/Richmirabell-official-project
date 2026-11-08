import test from "node:test";
import assert from "node:assert/strict";
import { subjects as seedSubjects, type Subject, type Topic } from "../data/catalog";

function removeTopicFromSubjects(subjects: Subject[], subjectId: string, topicId: string): Subject[] {
  return subjects.map((subject) =>
    subject.id === subjectId
      ? { ...subject, topics: subject.topics.filter((t) => t.id !== topicId) }
      : subject
  );
}

function removeMainTopicFromSubjects(subjects: Subject[], subjectId: string, mainTopicName: string): Subject[] {
  const target = mainTopicName.trim().toLowerCase();
  return subjects.map((subject) => {
    if (subject.id !== subjectId) return subject;
    return {
      ...subject,
      topics: subject.topics.filter((t) => (t.mainTopic ?? "Topics").trim().toLowerCase() !== target),
    };
  });
}

test("removeTopic removes only the specified subtopic and preserves sibling subtopics", () => {
  const mockSubjects: Subject[] = [
    {
      id: "physics",
      name: "Physics",
      exam: "JAMB",
      blurb: "",
      group: "sciences",
      topics: [
        { id: "p1", title: "Waves 1", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Waves" },
        { id: "p2", title: "Waves 2", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Waves" },
      ],
    },
    {
      id: "chemistry",
      name: "Chemistry",
      exam: "JAMB",
      blurb: "",
      group: "sciences",
      topics: [
        { id: "c1", title: "Atoms", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Structure" },
      ],
    },
  ];

  const updated = removeTopicFromSubjects(mockSubjects, "physics", "p1");
  const physics = updated.find((s) => s.id === "physics")!;
  const chemistry = updated.find((s) => s.id === "chemistry")!;

  assert.equal(physics.topics.length, 1);
  assert.equal(physics.topics[0].id, "p2");
  assert.equal(chemistry.topics.length, 1);
});

test("removeMainTopic removes all subtopics under the target main topic name", () => {
  const mockSubjects: Subject[] = [
    {
      id: "physics",
      name: "Physics",
      exam: "JAMB",
      blurb: "",
      group: "sciences",
      topics: [
        { id: "p1", title: "Waves 1", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Waves" },
        { id: "p2", title: "Waves 2", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Waves" },
        { id: "p3", title: "Gravity 1", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Gravity" },
      ],
    },
  ];

  const updated = removeMainTopicFromSubjects(mockSubjects, "physics", "Waves");
  const physics = updated.find((s) => s.id === "physics")!;

  assert.equal(physics.topics.length, 1);
  assert.equal(physics.topics[0].id, "p3");
  assert.equal(physics.topics[0].mainTopic, "Gravity");
});

test("removeMainTopic handles fallback 'Topics' group when mainTopic is undefined", () => {
  const mockSubjects: Subject[] = [
    {
      id: "math",
      name: "Math",
      exam: "JAMB",
      blurb: "",
      group: "sciences",
      topics: [
        { id: "m1", title: "Untitled 1", minutes: 10, summary: "", notes: [], questions: [] },
        { id: "m2", title: "Algebra 1", minutes: 10, summary: "", notes: [], questions: [], mainTopic: "Algebra" },
      ],
    },
  ];

  const updated = removeMainTopicFromSubjects(mockSubjects, "math", "Topics");
  const math = updated.find((s) => s.id === "math")!;

  assert.equal(math.topics.length, 1);
  assert.equal(math.topics[0].id, "m2");
});
