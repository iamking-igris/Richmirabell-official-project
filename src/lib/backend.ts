import { apiClient } from "@/services/api/client";
import { aiRequest } from "@/services/api/ai";
import { ApiError } from "@/services/api/errors";

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type Role = "STUDENT" | "ADMIN";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  email_verified: boolean;
  onboarding_complete: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: ApiUser;
}

export interface AuthSessionInfo {
  id: string;
  expires_at: string;
  revoked: boolean;
  current: boolean;
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/register", body),
  login: (body: { email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/login", body),
  google: (idToken: string) =>
    apiClient.post<TokenResponse>("/auth/google", { id_token: idToken }),
  me: () => apiClient.get<ApiUser>("/auth/me"),
  restore: () => apiClient.post<TokenResponse>("/auth/session/restore"),
  logout: () => apiClient.post<{ ok: boolean }>("/auth/logout"),
  logoutAll: () => apiClient.post<{ ok: boolean }>("/auth/logout-all"),
  sessions: () => apiClient.get<AuthSessionInfo[]>("/auth/sessions"),
  revokeSession: (id: string) => apiClient.delete<{ ok: boolean }>(`/auth/sessions/${id}`),
  requestPasswordReset: (email: string) =>
    apiClient.post<{ success: boolean; message: string }>(
      "/auth/password/reset-request",
      { email },
    ),
  confirmPasswordReset: (token: string, newPassword: string) =>
    apiClient.post<{ success: boolean }>("/auth/password/reset-confirm", {
      token,
      new_password: newPassword,
    }),
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export interface BackendSubjectSummary {
  id: string;
  name: string;
  exam: string | null;
  blurb: string | null;
  topic_count: number;
}

export interface BackendTopic {
  id: string;
  subject_id: string;
  title: string;
  summary: string;
  main_topic: string | null;
  minutes: number;
  status: "DRAFT" | "PUBLISHED" | string;
  objectives: string[];
  learning_objectives?: string[];
  body: unknown;
  questions: unknown[];
  theory: unknown[];
  source_keys: string[];
  created_at?: string | null;
}

export interface BackendSubjectDetail extends BackendSubjectSummary {
  topics: BackendTopic[];
}

export interface TopicPayload {
  id?: string;
  title: string;
  summary?: string;
  main_topic?: string | null;
  minutes?: number;
  objectives?: string[];
  learning_objectives?: string[];
  body?: unknown;
  questions?: unknown[];
  theory?: unknown[];
  source_keys?: string[];
  status?: "DRAFT" | "PUBLISHED";
  subject_id?: string;
  topic_id?: string | null;
  subtopic_id?: string | null;
  lesson_title?: string | null;
  author?: string | null;
}

export const contentApi = {
  listSubjects: () => apiClient.get<BackendSubjectSummary[]>("/content/subjects"),
  getSubject: (id: string) => apiClient.get<BackendSubjectDetail>(`/content/subjects/${id}`),
  listTopics: (subjectId: string, publishedOnly = true) =>
    apiClient.get<BackendTopic[]>(
      `/content/subjects/${subjectId}/topics?published_only=${publishedOnly ? "true" : "false"}`,
    ),
  getTopic: (id: string) => apiClient.get<BackendTopic>(`/content/topics/${id}`),
  adminGetTopic: (id: string) => apiClient.get<BackendTopic>(`/content/admin/topics/${id}`),
  createTopic: (subjectId: string, body: TopicPayload) =>
    apiClient.post<BackendTopic>(`/content/subjects/${subjectId}/topics`, body),
  updateTopic: (id: string, body: Partial<TopicPayload>) =>
    apiClient.put<BackendTopic>(`/content/topics/${id}`, body),
  patchTopic: (id: string, body: Partial<TopicPayload>) =>
    apiClient.patch<BackendTopic>(`/content/topics/${id}`, body),
  publishTopic: (id: string) => apiClient.post<{ id: string; status: string }>(`/content/topics/${id}/publish`),
  unpublishTopic: (id: string) =>
    apiClient.post<{ id: string; status: string }>(`/content/topics/${id}/unpublish`),
  deleteTopic: (id: string) => apiClient.delete<{ ok: boolean }>(`/content/topics/${id}`),
  deleteMainTopic: (subjectId: string, name: string) =>
    apiClient.delete<{ ok: boolean; deleted: number }>(
      `/content/subjects/${subjectId}/main-topics/${encodeURIComponent(name)}`,
    ),
  uploadAsset: (file: File, topicId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (topicId) form.append("topic_id", topicId);
    return apiClient.post<{
      id: string;
      key: string;
      filename: string;
      content_type: string;
      size_bytes: number;
      created_at: string;
      url: string;
      topic_id: string | null;
      lesson_id: string | null;
    }>("/content/assets", form);
  },
  getAsset: (key: string) => apiClient.get<Blob>(`/content/assets/${key}`),
  getRevisions: (topicId: string) =>
    apiClient.get<
      {
        id: string;
        lesson_id: string;
        revision: number;
        snapshot: unknown;
        author: string | null;
        status: string;
        created_at: string;
      }[]
    >(`/content/topics/${topicId}/revisions`),
};

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  pathway: "sciences" | "arts" | "commercial";
  exams: string[];
  jambSubjects: string[];
  selectedSubjects: string[];
  examMonth: string | null;
  onboardingComplete: boolean;
  hasAccess: boolean;
  onTrial: boolean;
  trialEndsAt: string;
  subscribed: boolean;
  subscriptionEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptCounts {
  total_questions?: number;
  objective_total?: number;
  correct?: number;
  incorrect?: number;
  skipped?: number;
  answered?: number;
  score?: number;
}

export interface AttemptItemSnapshot {
  id: string;
  prompt: string;
  options?: { key: string; text: string }[];
  answer?: string | null;
  explain?: string;
  pick?: string | null;
  correct?: boolean | null;
  status?: string;
  theory?: boolean;
  written?: string;
  modelAnswer?: string;
  markingGuide?: string;
  marks?: number | string | null;
  subjectId?: string | null;
  subject?: string | null;
}

export interface ProgressQuiz {
  id: string;
  topic_id: string | null;
  kind: string;
  score: number;
  total: number;
  percentage: number;
  at: string;
  title?: string | null;
  subject_id?: string | null;
  subject_label?: string | null;
  counts?: AttemptCounts;
}

export interface ProgressExam {
  id: string;
  mode: string;
  status: string;
  score: number;
  total: number;
  percentage: number;
  subject_scores: Record<string, { score: number; total: number }>;
  started_at: string;
  submitted_at: string | null;
  title?: string | null;
  counts?: AttemptCounts;
}

export interface Progress {
  quiz_attempts: number;
  exam_attempts: number;
  lessons_completed: number;
  best_by_topic: {
    topic_id: string;
    score: number;
    total: number;
    percentage: number;
    at: string;
  }[];
  quizzes: ProgressQuiz[];
  exams: ProgressExam[];
  lessons: { topic_id: string; completed_at: string }[];
}

export interface ProfilePayload {
  name?: string;
  exams?: string[];
  selected_subjects?: string[];
  jamb_subjects?: string[];
  exam_month?: string | null;
  onboarding_complete?: boolean;
}

export const studentsApi = {
  getProfile: () => apiClient.get<StudentProfile>("/students/me/profile"),
  saveProfile: (body: ProfilePayload) =>
    apiClient.put<StudentProfile>("/students/me/profile", body),
  getProgress: () => apiClient.get<Progress>("/students/me/progress"),
  completeLesson: (topicId: string) =>
    apiClient.post<{ ok: boolean; topic_id: string; completed_at: string }>(
      `/students/me/lessons/${topicId}/complete`,
    ),
  listStudents: () => apiClient.get<AdminStudent[]>("/students"),
};

/* ------------------------------------------------------------------ */
/* Assessments                                                         */
/* ------------------------------------------------------------------ */

export interface QuizResult {
  id: string;
  pick: string | null;
  correct: boolean;
  answer: string;
  explain: string;
}

export interface QuizResponse {
  topic_id: string;
  title: string;
  subject_id: string;
  questions: unknown[];
  theory: unknown[];
}

export interface QuizSubmitResponse {
  id: string;
  topic_id: string;
  score: number;
  total: number;
  counts?: AttemptCounts;
  results: QuizResult[];
  title?: string;
  subject_label?: string;
}

export interface CbtSection {
  subject: string;
  questions: unknown[];
}

export interface CbtStartResponse {
  id: string;
  total: number;
  duration_minutes: number;
  started_at: string;
  sections: CbtSection[];
}

export interface CbtExamResponse extends CbtStartResponse {
  mode: string;
  status: string;
  deadline: string;
  answers: Record<string, string>;
}

export interface CbtSubmitResponse {
  id: string;
  score: number;
  total: number;
  status: string;
  subject_scores: Record<string, { score: number; total: number }>;
  timed_out: boolean;
}

export interface CbtHistoryItem {
  id: string;
  mode: string;
  status: string;
  score: number;
  total: number;
  subject_scores: Record<string, { score: number; total: number }>;
  started_at: string;
  submitted_at: string | null;
  title?: string;
  /** Present for weekly examination attempts (null for Full JAMB CBT). */
  weekly_examination_id?: string | null;
}

export interface AttemptSyncPayload {
  topic_id?: string | null;
  title?: string;
  kind?: string;
  picks?: Record<string, string>;
  written?: Record<string, string>;
  items?: unknown[];
  total?: number;
  subject_label?: string | null;
}

export interface AttemptDetail {
  id: string;
  topic_id: string | null;
  kind: string;
  assessment_type?: string;
  score: number;
  total: number;
  counts?: AttemptCounts;
  picks: Record<string, string>;
  written: Record<string, string>;
  items: AttemptItemSnapshot[];
  results?: QuizResult[];
  title?: string;
  title_snapshot?: string | null;
  topic_title_snapshot?: string | null;
  subject_id?: string | null;
  subject_label?: string | null;
  verified?: boolean;
  status?: string;
  subject_scores?: Record<string, { score: number; total: number }>;
  created_at: string;
  started_at?: string;
  submitted_at?: string | null;
}

export interface AttemptReviewPayload {
  status: string;
  review: {
    id: string;
    attempt_id: string;
    attempt_kind: string;
    student_id: string;
    assessment_type: string;
    topic_id: string | null;
    topic_title_snapshot: string | null;
    subject_id: string | null;
    subject_label: string | null;
    status: string;
    version: number;
    summary: string | null;
    strengths: unknown[];
    weak_areas: unknown[];
    mistake_diagnostics: unknown[];
    recommendations: unknown[];
    references: unknown[];
    diagnostic_json: Record<string, unknown>;
    model: string | null;
    provider: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string | null;
  } | null;
}

export const assessmentsApi = {
  getQuiz: (topicId: string) => apiClient.get<QuizResponse>(`/assessments/topics/${topicId}`),
  submitQuiz: (topicId: string, picks: Record<string, string>, written: Record<string, string> = {}) =>
    apiClient.post<QuizSubmitResponse>(`/assessments/topics/${topicId}/submit`, { picks, written }),
  listAttempts: () =>
    apiClient.get<
      { id: string; topic_id: string | null; kind: string; score: number; total: number; created_at: string; title?: string; subject_label?: string; counts?: AttemptCounts }[]
    >("/assessments/attempts"),
  getAttempt: (id: string) => apiClient.get<AttemptDetail>(`/assessments/attempts/${id}`),
  getAttemptReview: (id: string) => apiClient.get<AttemptReviewPayload>(`/assessments/attempts/${id}/review`),
  saveAttemptReview: (id: string, body: Record<string, unknown>) =>
    apiClient.post<{ saved: boolean; review: NonNullable<AttemptReviewPayload["review"]> }>(
      `/assessments/attempts/${id}/review`,
      body,
    ),
  syncAttempt: (body: AttemptSyncPayload) =>
    apiClient.post<{ id: string; score: number; total: number; title: string; counts?: AttemptCounts; subject_label?: string | null; verified?: boolean }>(
      "/assessments/attempts/sync",
      body,
    ),
  /**
   * The separate Full JAMB CBT start endpoint was retired with the offering:
   * Weekly CBT (`weeklyExamsApi.startAttempt`) is the only way to create a
   * full JAMB paper now. This wrapper only exists to give any stale caller a
   * clear client-side error instead of silently creating an obsolete attempt.
   */
  startCbt: async (_subjects: string[], _exam = "jamb"): Promise<never> => {
    throw new ApiError(
      "Full JAMB CBT has been retired. Start the Weekly CBT paper from the Examination Hub instead.",
      410,
      "full_jamb_retired",
    );
  },
  getCbt: (examId: string) => apiClient.get<CbtExamResponse>(`/assessments/cbt/${examId}`),
  saveCbtAnswers: (examId: string, answers: Record<string, string>, timeSpentSeconds?: number) =>
    apiClient.patch<{ ok: boolean; saved: number }>(`/assessments/cbt/${examId}/answers`, {
      answers,
      time_spent_seconds: timeSpentSeconds,
    }),
  submitCbt: (examId: string, picks: Record<string, string>, written: Record<string, string> = {}) =>
    apiClient.post<CbtSubmitResponse>(`/assessments/cbt/${examId}/submit`, { picks, written }),
  cbtHistory: () => apiClient.get<CbtHistoryItem[]>("/assessments/cbt/history"),
  /**
   * Deterministic topic-level performance review for a SUBMITTED attempt.
   * Built server-side from saved question metadata + answers (no AI).
   */
  cbtPerformance: (examId: string) =>
    apiClient.get<CbtPerformance>(`/assessments/cbt/${examId}/performance`),
};

/** Deterministic classification for one topic (backend min-sample rules). */
export type TopicClassification =
  | "strong"
  | "developing"
  | "needs_improvement"
  | "not_enough_data";

export interface CbtTopicPerformance {
  subject: string;
  topic: string;
  subtopics: string[];
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  /** null when nothing in this topic was answered. */
  accuracy: number | null;
  classification: TopicClassification;
  /** Published Notes topic when one genuinely matches; never invented. */
  notes_topic_id: string | null;
  notes_topic_title: string | null;
}

export interface CbtSubjectPerformance {
  subject: string;
  label: string;
  scored_questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number | null;
  topics: CbtTopicPerformance[];
}

export interface CbtPerformanceRecommendation {
  subject: string;
  topic: string;
  classification: TopicClassification;
  accuracy: number | null;
  attempted: number;
  correct: number;
  notes_topic_id: string | null;
  notes_topic_title: string | null;
  message: string;
}

export interface CbtPerformance {
  attempt_id: string;
  title: string | null;
  status: string;
  submitted_at: string | null;
  totals: {
    attempted: number;
    correct: number;
    incorrect: number;
    skipped: number;
    accuracy: number | null;
  };
  min_sample_size: number;
  sections: CbtSubjectPerformance[];
  recommendations: CbtPerformanceRecommendation[];
}

export type WeeklyExamStatus =
  | "draft"
  | "generating"
  | "generation_failed"
  | "needs_review"
  | "ready_to_publish"
  | "scheduled"
  | "live"
  | "completed"
  | "archived";

/** Backend-authoritative student visibility (never computed in the browser). */
export type WeeklyVisibility = "live" | "coming_soon" | "closed";

export interface WeeklySection {
  id: string;
  examination_id: string;
  subject_id: string;
  required_count: number;
  generated_count: number;
  section_status: string;
  generation_status: string;
  review_status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface WeeklyExam {
  id: string;
  title: string;
  description: string;
  week_identifier: string | null;
  instructions: string;
  duration_minutes: number;
  total_questions: number;
  opening_at: string | null;
  closing_at: string | null;
  status: WeeklyExamStatus;
  configuration: Record<string, unknown>;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  sections: WeeklySection[];
}

export interface WeeklyQuestion {
  id: string;
  section_id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
  subject: string;
  topic: string | null;
  subtopic: string | null;
  difficulty: string;
  passage_reference: string | null;
  passage_data: Record<string, unknown> | null;
  generation_provenance: string;
  review_status: string;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export type WeeklyQuestionDraft = Omit<WeeklyQuestion, "id" | "created_at" | "updated_at"> &
  Partial<Pick<WeeklyQuestion, "id" | "created_at" | "updated_at">>;

export interface GenerationBatch {
  id: string;
  job_id: string;
  section_id: string;
  batch_identifier: string;
  expected_count: number;
  success_count: number;
  failed_count: number;
  batch_status: "pending" | "generating" | "partially_completed" | "failed" | "completed" | "retry_pending";
  retry_count: number;
  error_classification: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface GenerationJob {
  id: string;
  examination_id: string;
  generation_mode: string;
  status: "pending" | "running" | "partial" | "completed" | "failed";
  requested_subjects: string[];
  batch_size: number;
  requested_count: number;
  generated_count: number;
  completed_batches: number;
  failed_batches: number;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failure_details: string | null;
  retry_metadata: Record<string, unknown>;
  batches: GenerationBatch[];
}

export interface GenerationStartBody {
  generation_mode?: "full" | "subject" | "question";
  subjects?: string[];
  batch_size?: number;
  target_count?: number | null;
  topic_focus?: string | null;
  difficulty?: string;
  syllabus_focus?: string | null;
}

export interface GenerationResult {
  job_id: string;
  batch_identifier: string;
  persisted: number;
  rejected: number;
  duplicates: number;
  errors: string[];
}

export interface ReadinessSection {
  required: number;
  generated: number;
  approved: number;
  status: string;
  review_status: string;
  generation_status: string;
  ready: boolean;
}

export interface ReadinessReport {
  examination_id: string;
  status: string;
  sections: Record<string, ReadinessSection>;
  all_approved: boolean;
  can_publish: boolean;
  missing: string[];
  errors: string[];
}

export interface AuditFinding {
  type: string;
  severity: "error" | "warning";
  subject: string | null;
  question_ids: string[];
  message: string;
  similarity?: number;
}

export interface WeeklyAudit {
  examination_id: string;
  status: string;
  checked_at: string;
  method: string;
  counts: Record<string, { required: number; generated: number; approved: number; unapproved: number }>;
  previous_examinations_compared: number;
  findings: AuditFinding[];
  summary: {
    errors: number;
    warnings: number;
    duplicate_pairs: number;
    invalid_questions: number;
    cross_paper_matches: number;
  };
  clean: boolean;
}

export interface WeeklyHistoryEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface StudentWeeklyExam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  opening_at: string | null;
  closing_at: string | null;
  status: WeeklyExamStatus;
  week_identifier: string | null;
  visibility: WeeklyVisibility;
  total_questions: number;
  sections: WeeklySection[];
  can_start: boolean;
  reason: string | null;
  /** Attempt state for THIS student, computed by the backend. */
  attempt_id: string | null;
  attempt_status: string | null;
  /** Unfinished attempt can be resumed while the window is open. */
  resumable: boolean;
  /** A completed attempt exists and the window is still open → Retake. */
  retake_allowed: boolean;
  attempts_taken: number;
}

export interface WeeklyAttemptStart {
  attempt_id: string;
  examination_id: string;
  examination_title: string;
  duration_minutes: number;
  sections: Array<{ subject: string; questions: Array<Record<string, unknown>> }>;
  total_questions: number;
  started_at: string | null;
  deadline: string | null;
  resuming: boolean;
}

/** One Gemini relay response from the Express server (keys never reach here). */
export interface GeminiRelayQuestion {
  prompt: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: string;
  /** Physics only: model-classified question type (conceptual | numerical | experimental | diagram | application | unclassified). */
  type: string;
}

export interface GeminiRelayResponse {
  ok: true;
  subject: string;
  requested: number;
  returned: number;
  rejected: number;
  questions: GeminiRelayQuestion[];
  /** Physics only — present when the diversity gate ran. */
  types?: Record<string, number>;
  repaired?: boolean;
  repair_notes?: string[];
  corrections_applied?: number;
  dropped_dominant?: number;
}

export interface GeminiRelayRequestBody {
  subject: string;
  count: number;
  topic_focus?: string;
  difficulty?: string;
  syllabus_focus?: string;
  exclude_prompts?: string[];
}

const WEEKLY_BASE = "/weekly-examinations";

export const weeklyExamsApi = {
  /* --- examination lifecycle (admin) --- */
  list: (status?: WeeklyExamStatus) =>
    apiClient.get<WeeklyExam[]>(status ? `${WEEKLY_BASE}?status=${status}` : WEEKLY_BASE),
  create: (body: {
    title: string;
    description?: string;
    week_identifier?: string;
    instructions?: string;
    duration_minutes?: number;
    total_questions?: number;
    opening_at?: string | null;
    closing_at?: string | null;
    subject_counts?: Record<string, number>;
  }) => apiClient.post<WeeklyExam>(WEEKLY_BASE, body),
  get: (id: string) => apiClient.get<WeeklyExam>(`${WEEKLY_BASE}/${id}`),
  update: (id: string, body: Record<string, unknown>) =>
    apiClient.put<WeeklyExam>(`${WEEKLY_BASE}/${id}`, body),
  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`${WEEKLY_BASE}/${id}`),
  history: (id: string) => apiClient.get<WeeklyHistoryEntry[]>(`${WEEKLY_BASE}/${id}/history`),

  /* --- controlled batched generation --- */
  startGeneration: (id: string, body: GenerationStartBody = {}) =>
    apiClient.post<GenerationJob>(`${WEEKLY_BASE}/${id}/generation/start`, body),
  startSubjectGeneration: (id: string, subjectId: string, body: GenerationStartBody = {}) =>
    apiClient.post<GenerationJob & { section_id: string; subject_id: string }>(
      `${WEEKLY_BASE}/${id}/generation/subject/${subjectId}`,
      body,
    ),
  getJob: (jobId: string) => apiClient.get<GenerationJob>(`${WEEKLY_BASE}/generation-jobs/${jobId}`),
  jobs: (examId: string) =>
    apiClient.get<GenerationJob[]>(`${WEEKLY_BASE}/${examId}/generation-jobs`),
  getBatch: (batchId: string) =>
    apiClient.get<GenerationBatch>(`${WEEKLY_BASE}/generation-batches/${batchId}`),
  startBatch: (batchId: string) =>
    apiClient.post<{ batch_id: string; batch_status: string }>(
      `${WEEKLY_BASE}/generation-batches/${batchId}/start`,
    ),
  retryBatch: (batchId: string) =>
    apiClient.post<{ batch_id: string; retry_count: number; batch_status: string }>(
      `${WEEKLY_BASE}/generation-batches/${batchId}/retry`,
    ),
  persistBatch: (body: {
    job_id: string;
    batch_identifier: string;
    results: Array<{ section_id: string; questions: WeeklyQuestionDraft[] }>;
    error_classification?: string;
  }) => apiClient.post<GenerationResult>(`${WEEKLY_BASE}/generation-results`, body),

  /* --- question bank editing --- */
  questions: (examId: string, subjectId?: string) =>
    apiClient.get<WeeklyQuestion[]>(
      subjectId
        ? `${WEEKLY_BASE}/${examId}/questions?subject_id=${encodeURIComponent(subjectId)}`
        : `${WEEKLY_BASE}/${examId}/questions`,
    ),
  addQuestion: (body: WeeklyQuestionDraft) =>
    apiClient.post<WeeklyQuestion>(`${WEEKLY_BASE}/questions`, body),
  updateQuestion: (questionId: string, body: Partial<WeeklyQuestionDraft>) =>
    apiClient.put<WeeklyQuestion>(`${WEEKLY_BASE}/questions/${questionId}`, body),
  deleteQuestion: (questionId: string) =>
    apiClient.delete<{ id: string }>(`${WEEKLY_BASE}/questions/${questionId}`),
  approveQuestion: (questionId: string, approved = true) =>
    apiClient.post<{ id: string; review_status: string }>(
      `${WEEKLY_BASE}/questions/${questionId}/approve`,
      { approved },
    ),
  section: (examId: string, subjectId: string) =>
    apiClient.get<WeeklySection>(`${WEEKLY_BASE}/${examId}/sections/${subjectId}`),

  /* --- review, readiness, audit, publication --- */
  readiness: (examId: string, requireSchedule = true) =>
    apiClient.get<ReadinessReport>(
      `${WEEKLY_BASE}/${examId}/readiness?require_schedule=${requireSchedule}`,
    ),
  audit: (examId: string) => apiClient.get<WeeklyAudit>(`${WEEKLY_BASE}/${examId}/audit`),
  saveDraft: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/save-draft`),
  markReady: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/mark-ready`),
  publish: (examId: string, body: { publish_now?: boolean } = {}) =>
    apiClient.post<{
      id: string;
      status: string;
      opening_at?: string | null;
      closing_at?: string | null;
      note?: string;
    }>(`${WEEKLY_BASE}/${examId}/publish`, body),
  /**
   * The one scheduling action (CBT-08): both dates are saved together and
   * validated by the backend (closing strictly after opening, both
   * required). `expected_*` carry the values the editor was pre-filled
   * with — when they no longer match the stored schedule the backend
   * answers 409 with the latest values in `detail` instead of
   * overwriting them (stale-editor protection, CBT-09).
   */
  schedule: (examId: string, body: {
    opening_at: string;
    closing_at: string;
    expected_opening_at?: string | null;
    expected_closing_at?: string | null;
  }) => apiClient.post<WeeklyExam>(`${WEEKLY_BASE}/${examId}/schedule`, body),
  cancelSchedule: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/cancel-schedule`),
  restore: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/restore`),
  unarchive: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/unarchive`),
  archive: (examId: string) =>
    apiClient.post<{ id: string; status: string }>(`${WEEKLY_BASE}/${examId}/archive`),

  /* --- student discovery and attempts --- */
  discover: () => apiClient.get<StudentWeeklyExam[]>(`${WEEKLY_BASE}/student/weekly-examinations`),
  studentGet: (examId: string) =>
    apiClient.get<StudentWeeklyExam>(`${WEEKLY_BASE}/student/weekly-examinations/${examId}`),
  startAttempt: (examId: string) =>
    apiClient.post<WeeklyAttemptStart>(
      `${WEEKLY_BASE}/student/weekly-examinations/${examId}/start`,
    ),

  /**
   * Start (or resume) with timeout recovery — Phase 3.
   *
   * The backend creates the attempt BEFORE responding, so a request that
   * times out may still have succeeded. The start endpoint itself is
   * idempotent (it resumes an existing IN_PROGRESS attempt), so a single
   * retry is safe; if the retry also fails we ask discovery for the attempt
   * the server already holds rather than telling the student it failed.
   */
  startAttemptSafely: async (examId: string): Promise<{ attempt_id: string; resuming: boolean }> => {
    const isConnectionFailure = (err: unknown): boolean =>
      err instanceof ApiError &&
      (err.code === "TIMEOUT" ||
        err.code === "SERVICE_UNAVAILABLE" ||
        err.statusCode === 408 ||
        err.statusCode === 503);

    try {
      const started = await weeklyExamsApi.startAttempt(examId);
      return { attempt_id: started.attempt_id, resuming: started.resuming };
    } catch (err) {
      if (!isConnectionFailure(err)) throw err;
      try {
        const retried = await weeklyExamsApi.startAttempt(examId);
        return { attempt_id: retried.attempt_id, resuming: retried.resuming };
      } catch (retryErr) {
        const entries = await weeklyExamsApi.discover().catch(() => null);
        const entry = entries?.find((item) => item.id === examId);
        if (entry?.attempt_id) {
          return { attempt_id: entry.attempt_id, resuming: entry.resumable };
        }
        throw retryErr;
      }
    }
  },

  /**
   * Server-side Gemini relay (FastAPI). The API key stays on the server; this
   * only forwards an admin session and receives validated question JSON.
   * Failures keep a top-level `code` (quota | rate_limit | timeout |
   * bad_output | key_missing) so the CBT generation loop can stop cleanly.
   */
  generateWithGemini: (body: GeminiRelayRequestBody) =>
    aiRequest<GeminiRelayResponse>("/ai/cbt/generate-questions", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: 150_000,
    }),
};

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  active: boolean;
}

export interface AccessState {
  has_access: boolean;
  on_trial: boolean;
  trial_ends_at: string;
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    source: string;
    starts_at: string;
    ends_at: string;
  } | null;
}

export interface PaymentInitResponse {
  reference: string;
  amount: number;
  currency: string;
  configured: boolean;
  authorization_url: string | null;
  access_code?: string;
  message?: string;
}

export interface PaymentVerifyResponse {
  status: string;
  reference: string;
  configured: boolean;
  message?: string;
  subscription?: { starts_at: string; ends_at: string } | null;
}

export interface Transaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  provider: string;
  plan_id: string | null;
  plan_name: string | null;
  created_at: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
}

export interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  source: string;
  starts_at: string;
  ends_at: string;
}

export const billingApi = {
  plans: () => apiClient.get<Plan[]>("/billing/plans"),
  access: () => apiClient.get<AccessState>("/billing/access"),
  initPayment: (planId: string) =>
    apiClient.post<PaymentInitResponse>("/billing/payments/init", { plan_id: planId }),
  verifyPayment: (reference: string) =>
    apiClient.post<PaymentVerifyResponse>(`/billing/payments/verify/${reference}`),
  transactions: () => apiClient.get<Transaction[]>("/billing/transactions"),
  subscriptions: () => apiClient.get<Subscription[]>("/billing/subscriptions"),
  grant: (userId: string, durationDays?: number, reason = "Manual admin grant") =>
    apiClient.post<{ ok: boolean; subscription_id: string; starts_at: string; ends_at: string }>(
      `/billing/admin/grants/${userId}`,
      { duration_days: durationDays, reason },
    ),
  updatePlan: (planId: string, body: { name?: string; price?: number; duration_days?: number; active?: boolean }) =>
    apiClient.patch<Plan>(`/billing/admin/plans/${planId}`, body),
};


/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export interface AdminOverview {
  totalStudents: number;
  newlyRegistered: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingReviews: number;
  draftTopics: number;
}

export interface AdminTransaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  provider: string;
  planId: string | null;
  planName: string | null;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  planId: string;
  status: string;
  source: string;
  startsAt: string;
  endsAt: string;
  paymentId: string | null;
}

export interface AdminPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  detail: unknown;
  createdAt: string;
}

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  role: string;
  exams: string[];
  jambSubjects: string[];
  selectedSubjects: string[];
  examMonth: string | null;
  onboardingComplete: boolean;
  subscribed: boolean;
  subscriptionEndsAt: string | null;
  hasAccess: boolean;
  registeredAt: string;
  created_at: string;
}

export interface AiStatus {
  ok: boolean;
  configured: boolean;
  model: string;
  /** Models the current Gemini integration supports (from the server). */
  models?: string[];
  /** Masked hint of the active key (never the raw value). */
  keyHint?: string;
  /** Where the active key comes from: saved | environment | file | builtin | none. */
  keySource?: string;
  /** ISO timestamp / admin email of the last saved Gemini configuration change. */
  updatedAt?: string | null;
  updatedBy?: string | null;
  temperatures: {
    ocr: number;
    review: number;
    theory: number;
    cbt: number;
  };
  provider: string;
  method: string;
  secretLocation: string;
  statusText: string;
}

export interface SetModelBody {
  model: string;
}

export interface SetTemperatureBody {
  category: "ocr" | "review" | "theory" | "cbt";
  temperature: number;
}

export interface GeminiConfigBody {
  /** New API key to save (empty string clears it → env/builtin key takes over). */
  apiKey?: string;
  /** Gemini model id (must be one the integration supports). */
  model?: string;
  /** Convenience flag to remove the saved key. */
  clearKey?: boolean;
}

export interface SettingsCategoryStamp {
  updated_at: string | null;
  updated_by: string | null;
}

export interface PlatformSettingsResponse {
  general: { platform_name: string } & SettingsCategoryStamp;
  info: {
    app_name: string;
    environment: string;
    frontend_url: string;
    session_ttl_hours: number;
    password_reset_ttl_minutes: number;
    trial_days: number;
    monthly_price_ngn: number;
    monthly_days: number;
  };
  learning: {
    subjects: {
      id: string;
      name: string;
      total_topics: number;
      published_topics: number;
      draft_topics: number;
    }[];
    published_topics: number;
    draft_topics: number;
  };
  examinations: {
    default_duration_minutes: number;
    duration_min: number;
    duration_max: number;
    paper_total_questions: number;
    english_questions: number;
    elective_count: number;
    elective_questions_each: number;
  } & SettingsCategoryStamp;
  users: {
    registration_open: boolean;
    student_count: number;
    admin_count: number;
    session_ttl_hours: number;
    password_reset_ttl_minutes: number;
    register_rate_limit: number | null;
  } & SettingsCategoryStamp;
  payments: {
    configured: boolean;
    source: "settings" | "environment" | "none";
    public_key_hint: string;
    secret_key_hint: string;
    base_url: string;
  } & SettingsCategoryStamp;
}

export interface PlatformSettingUpdate {
  ok: boolean;
  key: string;
  general?: PlatformSettingsResponse["general"];
  examinations?: PlatformSettingsResponse["examinations"];
  users?: PlatformSettingsResponse["users"];
  payments?: PlatformSettingsResponse["payments"];
}

export const adminApi = {
  overview: () => apiClient.get<AdminOverview>("/admin/overview"),
  transactions: () => apiClient.get<AdminTransaction[]>("/admin/transactions"),
  subscriptions: () => apiClient.get<AdminSubscription[]>("/admin/subscriptions"),
  plans: () => apiClient.get<AdminPlan[]>("/admin/plans"),
  audit: () => apiClient.get<AuditEntry[]>("/admin/audit"),
  students: () => apiClient.get<AdminStudent[]>("/students"),
  aiStatus: () => aiRequest<AiStatus>("/ai/admin/status"),
  setModel: (body: SetModelBody) =>
    aiRequest<{ ok: boolean; model: string }>("/ai/admin/model", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setTemperature: (body: SetTemperatureBody) =>
    aiRequest<{ ok: boolean; category: string; temperature: number }>(
      "/ai/admin/temperature",
      { method: "POST", body: JSON.stringify(body) },
    ),
  /* Gemini key/model configuration — server-side, persisted, never echoed raw. */
  saveGeminiConfig: (body: GeminiConfigBody) =>
    aiRequest<AiStatus>("/ai/admin/config", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testAi: () =>
    aiRequest<{ ok: boolean; message: string }>("/ai/admin/test", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  /* Platform settings (FastAPI, admin-only). */
  platformSettings: () => apiClient.get<PlatformSettingsResponse>("/admin/settings"),
  updatePlatformSetting: (key: string, value: Record<string, unknown>) =>
    apiClient.put<PlatformSettingUpdate>(`/admin/settings/${key}`, { value }),
};
