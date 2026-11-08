import { demoPhysicsTopics } from "./physics";
import { demoJambBank, demoJambPaper, buildJambPaper } from "./jamb";
import { demoWaecPapers, findWaecPaper } from "./waec";
import type { Topic } from "@/data/catalog";
export { demoPhysicsTopics, demoJambBank, demoJambPaper, buildJambPaper, demoWaecPapers, findWaecPaper };

export function withDemoPhysicsTopics(topics: Topic[]): Topic[] {
  // Returns genuine shipped topics without appending synthetic demo topics
  return topics;
}

export function demoInventory() {
  return {
    physicsDemoTopics: 0,
    physicsDemoMcq: 0,
    physicsDemoTheory: 0,
    jambBank: 0,
    jambPaperQuestions: 0,
    waecPapers: 0,
    waecObjectiveItems: 0,
    waecTheoryItems: 0,
  };
}
