export type Choice = "A" | "B" | "C" | "D";
export type ReviewStatus = "AI Solved" | "Needs Review" | "Teacher Reviewed";

export type Question = {
  id: string;
  prompt: string;
  options: { key: Choice; text: string }[];
  answer?: Choice;
  explain?: string;
  answerKeyStatus?: "shipped" | "demo" | "missing";
  needsReview?: boolean;
  reviewReason?: string;
  sourceOrigin?: "ai_solved" | "key_matched" | "manual";
  reviewStatus?: ReviewStatus;
};

export interface TheoryPart {
  label: string;
  questionText: string;
  directAnswer: string;
  tutorExplanation: string;
  marks?: string;
}

export type TheoryQuestion = {
  id: string;
  introText?: string;
  parts?: TheoryPart[];
  diagramSvg?: string;
  diagramCaption?: string;
  prompt: string;
  modelAnswer?: string;
  marks?: number;
  explain?: string;
  subparts?: { label: string; prompt: string; modelAnswer: string; marks?: number }[];
  needsReview?: boolean;
  reviewReason?: string;
  sourceOrigin?: "ai_solved" | "key_matched" | "manual";
  reviewStatus?: ReviewStatus;
};

export type NoteBlock = {
  heading: string;
  paragraphs: string[];
  formula?: string;
  points?: string[];
  diagramCaption?: string;
  diagramSvg?: string;
};

export type ContentOrigin = "shipped" | "demo";

export type Topic = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  diagram?: "wave" | "cell" | "balance";
  objectives?: string[];
  notes: NoteBlock[];
  body?: string;
  questions: Question[];
  theory?: TheoryQuestion[];
  status?: "published" | "draft";
  mainTopic?: string;
  origin?: ContentOrigin;
  source_keys?: string[];
};

export type SubjectGroup = "sciences" | "arts" | "commercial";

export type Subject = {
  id: string;
  name: string;
  exam: string;
  blurb: string;
  group: SubjectGroup;
  /** Optional photo path. Defaults to /media/<id>.jpg */
  photo?: string;
  topics: Topic[];
  /** Admin-controlled. false hides the subject from students. */
  available?: boolean;
};

export type NewsItem = {
  id: string;
  tag: string;
  title: string;
  date: string;
  body: string;
};

export type Guide = {
  id: string;
  title: string;
  detail: string;
  points: string[];
};
