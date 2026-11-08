import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Choice } from "@/data/catalog";

export type JambSectionSubject = "english" | "mathematics" | "physics" | "chemistry" | "biology";

export const JAMB_SUBJECT_LABELS: Record<JambSectionSubject, string> = {
  english: "English Language",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

export const JAMB_SECTION_TARGETS: Record<JambSectionSubject, number> = {
  english: 60,
  mathematics: 40,
  physics: 40,
  chemistry: 40,
  biology: 40,
};

export const JAMB_SUBJECT_ROLES: Record<JambSectionSubject, string> = {
  english: "Compulsory for all JAMB candidates (60 questions in full 180Q UTME exam).",
  mathematics: "Core subject for Engineering, Physical Sciences, Computing & Commercial tracks (40 questions).",
  physics: "Core science subject for Medical, Engineering & Technology candidates (40 questions).",
  chemistry: "Core science subject for Medical, Pharmacy, Engineering & Chemical sciences (40 questions).",
  biology: "Core science subject for Medicine, Biological Sciences, Agriculture & Nursing (40 questions).",
};

export type QuestionOriginStatus =
  | "verified_past"
  | "uploaded_pending"
  | "uploaded_approved"
  | "uploaded_rejected"
  | "ai_generated_pending"
  | "ai_generated_approved"
  | "ai_generated_rejected";

export type QuestionBankItem = {
  id: string;
  subject: string;
  topic?: string;
  examType?: "WAEC" | "NECO" | "JAMB" | "Practice";
  year?: string;
  type: "multiple_choice" | "theory";
  prompt: string;
  options?: { key: Choice; text: string }[];
  answer?: Choice;
  explanation?: string;
  modelAnswer?: string;
  marks?: number;
  subparts?: { label: string; prompt: string; modelAnswer?: string; marks?: number }[];
  status: QuestionOriginStatus;
  createdAt: string;
};

export type ExamType = "weekly_jamb" | "full_jamb_mock";
export type ExamStatus =
  | "draft"
  | "published"
  | "archived"
  | "available"
  | "AVAILABLE"
  | "open"
  | "scheduled";

export function isExamPublishedOrAvailable(status: string | undefined): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return ["published", "available", "open", "scheduled"].includes(s);
}

export type ExamAuditLogItem = {
  id: string;
  examId: string;
  examTitle: string;
  action:
    | "created"
    | "edited"
    | "question_added"
    | "question_removed"
    | "section_modified"
    | "scheduled"
    | "rescheduled"
    | "published"
    | "opened"
    | "closed"
    | "archived"
    | "deleted";
  date: string;
  previousValue?: string;
  newValue?: string;
  adminName?: string;
};

export type AdminJambExam = {
  id: string;
  type: ExamType;
  title: string;
  weekOrPeriod: string; // e.g. "Week 4 · November 2026" or "Official Mock Cycle 1"
  instructions: string;
  durationMinutes: number; // Standard: 120 mins for 180Q exam
  startAt: string; // ISO datetime string
  endAt: string;   // ISO datetime string
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
  sections: Record<JambSectionSubject, QuestionBankItem[]>;
  mockConfig?: {
    totalQuestions: number; // 180
    subjects: string[];
  };
};

export type WeeklyCbtStatus =
  | "draft"
  | "awaiting_review"
  | "approved"
  | "scheduled"
  | "coming_soon"
  | "open"
  | "closed"
  | "available"
  | "AVAILABLE";

export type WeeklyCbtExam = {
  id: string;
  title: string;
  description: string;
  subject: string;
  questionIds: string[];
  questions: QuestionBankItem[];
  durationMinutes: number;
  startAt: string;
  endAt: string;
  status: WeeklyCbtStatus;
  createdAt: string;
  sections?: Record<JambSectionSubject, QuestionBankItem[]>;
};

// Calculate live Weekly CBT lifecycle status in Africa/Lagos timezone
export function getExamLifecycleState(
  startAt?: string,
  endAt?: string,
  baseStatus?: WeeklyCbtStatus | ExamStatus | string
): "coming_soon" | "open" | "closed" | "draft" | "archived" {
  const norm = String(baseStatus || "").toLowerCase();
  if (norm === "draft" || norm === "awaiting_review") return "draft";
  if (norm === "archived") return "archived";
  if (norm === "available" || norm === "open") return "open";

  const now = Date.now();
  const startMs = startAt ? new Date(startAt).getTime() : NaN;
  const endMs = endAt ? new Date(endAt).getTime() : NaN;

  if (isNaN(startMs) || isNaN(endMs)) {
    if (norm === "available" || norm === "open" || norm === "published") return "open";
    return "coming_soon";
  }

  if (now < startMs) {
    return "coming_soon";
  } else if (now >= startMs && now <= endMs) {
    return "open";
  } else {
    return "closed";
  }
}

export function parseWeekNumber(titleOrLabel: string): number {
  const m = String(titleOrLabel || "").match(/week\s*#?(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
}

export function getCurrentLiveExam(exams: AdminJambExam[]): AdminJambExam | null {
  const weekly = exams.filter((e) => e.type === "weekly_jamb");
  return (
    weekly.find((e) => {
      const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
      return state === "open";
    }) || null
  );
}

export function getNextScheduledExam(exams: AdminJambExam[]): AdminJambExam | null {
  const weekly = exams.filter((e) => e.type === "weekly_jamb");
  // 1. Look for an exam that is coming_soon (scheduled)
  const upcoming = weekly.find((e) => {
    const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
    return state === "coming_soon";
  });
  if (upcoming) return upcoming;

  // 2. Look for a draft whose week number is higher than the live exam, or marked draft with future startAt
  const live = getCurrentLiveExam(exams);
  const liveWeek = live ? parseWeekNumber(live.weekOrPeriod || live.title) : 0;

  const nextDraft = weekly.find((e) => {
    const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
    if (state !== "draft") return false;
    const wNum = parseWeekNumber(e.weekOrPeriod || e.title);
    return wNum > liveWeek || (e.startAt && new Date(e.startAt).getTime() > Date.now());
  });

  return nextDraft || null;
}

export function getPreviousExamHistory(exams: AdminJambExam[]): AdminJambExam[] {
  const weekly = exams.filter((e) => e.type === "weekly_jamb");
  return weekly
    .filter((e) => {
      const state = getExamLifecycleState(e.startAt, e.endAt, e.status);
      return state === "closed" || state === "archived";
    })
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
}

export function getNextWeekNumber(exams: AdminJambExam[]): number {
  let maxWeek = 0;
  for (const e of exams) {
    if (e.type === "weekly_jamb") {
      const w = parseWeekNumber(e.weekOrPeriod || e.title);
      if (w > maxWeek) maxWeek = w;
    }
  }
  return maxWeek + 1;
}

export function calculateDefaultNextWeekSchedule(currentExam?: AdminJambExam | null): {
  startAt: string;
  endAt: string;
  weekNumber: number;
} {
  const now = new Date();
  let startMs: number;

  if (currentExam && currentExam.endAt) {
    const currentEndMs = new Date(currentExam.endAt).getTime();
    startMs = currentEndMs;
  } else {
    // Next Sunday 08:00 AM Africa/Lagos
    const daysUntilNextSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilNextSunday);
    nextSunday.setHours(8, 0, 0, 0);
    startMs = nextSunday.getTime();
  }

  const endMs = startMs + 7 * 24 * 3600 * 1000;

  return {
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    weekNumber: currentExam ? parseWeekNumber(currentExam.weekOrPeriod || currentExam.title) + 1 : 1,
  };
}

export function formatLagosDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return (
      d.toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " (WAT)"
    );
  } catch {
    return isoStr;
  }
}

export type ValidationError = {
  section?: string;
  field?: string;
  message: string;
};

export function validateWeeklyExam(exam: AdminJambExam): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!exam.title.trim()) {
    errors.push({ field: "title", message: "Examination title is required." });
  }
  if (!exam.weekOrPeriod.trim()) {
    errors.push({ field: "weekOrPeriod", message: "Week or Period label is required." });
  }
  if (!exam.durationMinutes || exam.durationMinutes < 15) {
    errors.push({ field: "durationMinutes", message: "Duration must be at least 15 minutes." });
  }

  const subjects: JambSectionSubject[] = ["english", "mathematics", "physics", "chemistry", "biology"];
  let totalQuestions = 0;

  for (const s of subjects) {
    const list = exam.sections[s] || [];
    totalQuestions += list.length;
    const target = JAMB_SECTION_TARGETS[s];

    if (list.length === 0) {
      errors.push({
        section: s,
        message: `${JAMB_SUBJECT_LABELS[s]} has 0 questions. Each section must contain questions.`,
      });
    } else if (list.length < target) {
      errors.push({
        section: s,
        message: `${JAMB_SUBJECT_LABELS[s]} has ${list.length}/${target} questions (Recommended: ${target}).`,
      });
    }

    list.forEach((q, idx) => {
      if (!q.prompt?.trim()) {
        errors.push({
          section: s,
          message: `${JAMB_SUBJECT_LABELS[s]} Q#${idx + 1}: Question prompt is empty.`,
        });
      }
      if (!q.options || q.options.length < 4) {
        errors.push({
          section: s,
          message: `${JAMB_SUBJECT_LABELS[s]} Q#${idx + 1}: Must provide exactly 4 options (A-D).`,
        });
      }
      if (!q.answer) {
        errors.push({
          section: s,
          message: `${JAMB_SUBJECT_LABELS[s]} Q#${idx + 1}: Correct answer key is not selected.`,
        });
      }
    });
  }

  if (totalQuestions === 0) {
    errors.push({ message: "The examination contains no questions across any section." });
  }

  return errors;
}

// Grounded default seed questions generator for complete 180Q papers
export function getSubjectSeedQuestions(subject: JambSectionSubject, count: number = 40): QuestionBankItem[] {
  const items: QuestionBankItem[] = [];

  const baseSeeds: Record<JambSectionSubject, Array<{ prompt: string; options: [string, string, string, string]; answer: Choice; explanation: string; topic: string }>> = {
    english: [
      {
        prompt: "Choose the word nearest in meaning to the underlined word: The senator's remarks were completely <ins>candid</ins> during the budget debate.",
        options: ["secretive", "frank and straightforward", "evasive", "ambiguous"],
        answer: "B",
        explanation: "Candid means truthful, straightforward, and frank.",
        topic: "Lexis and Structure",
      },
      {
        prompt: "Choose the correct option: Neither the students nor their teacher ___ present at the symposium yesterday.",
        options: ["were", "was", "are", "have been"],
        answer: "B",
        explanation: "In 'neither... nor' sentences, the verb agrees in number with the subject closer to it.",
        topic: "Concord & Grammar",
      },
      {
        prompt: "Choose the word opposite in meaning to the underlined word: The committee took a <ins>stringent</ins> measure against late submission.",
        options: ["flexible", "strict", "harsh", "rigorous"],
        answer: "A",
        explanation: "Stringent means strict; the antonym is flexible or lenient.",
        topic: "Antonyms",
      },
      {
        prompt: "Identify the figure of speech used in the expression: 'The leaves danced gracefully in the gentle evening breeze.'",
        options: ["Simile", "Personification", "Metaphor", "Hyperbole"],
        answer: "B",
        explanation: "Personification gives human characteristics (dancing) to non-human objects (leaves).",
        topic: "Literary Devices",
      },
      {
        prompt: "Choose the option that best completes the sentence: The new policy was intended to ___ economic growth across rural communities.",
        options: ["stimulate", "stifle", "retard", "dampen"],
        answer: "A",
        explanation: "Stimulate means to encourage or spark activity and growth.",
        topic: "Vocabulary",
      },
    ],
    mathematics: [
      {
        prompt: "Find the roots of the quadratic equation: x^2 - 7x + 12 = 0.",
        options: ["x = 3 or x = 4", "x = -3 or x = -4", "x = 2 or x = 6", "x = 1 or x = 12"],
        answer: "A",
        explanation: "(x - 3)(x - 4) = 0 => x = 3 or x = 4.",
        topic: "Quadratic Equations",
      },
      {
        prompt: "If \\log_{10} 2 = 0.3010, evaluate \\log_{10} 20 without mathematical tables.",
        options: ["1.3010", "2.3010", "0.6020", "3.0100"],
        answer: "A",
        explanation: "\\log_{10} 20 = \\log_{10} (2 \\times 10) = \\log_{10} 2 + \\log_{10} 10 = 0.3010 + 1 = 1.3010.",
        topic: "Logarithms",
      },
      {
        prompt: "Calculate the gradient (slope) of the straight line passing through points A(2, 5) and B(6, 13).",
        options: ["2", "4", "3", "0.5"],
        answer: "A",
        explanation: "m = (y2 - y1) / (x2 - x1) = (13 - 5) / (6 - 2) = 8 / 4 = 2.",
        topic: "Coordinate Geometry",
      },
      {
        prompt: "Find the 15th term of the Arithmetic Progression (A.P.): 4, 9, 14, 19, ...",
        options: ["74", "70", "79", "69"],
        answer: "A",
        explanation: "T_n = a + (n - 1)d = 4 + (14)(5) = 4 + 70 = 74.",
        topic: "Sequences and Series",
      },
      {
        prompt: "Evaluate the definite integral: \\int_{0}^{2} (3x^2 + 2x) \\, dx.",
        options: ["12", "8", "16", "10"],
        answer: "A",
        explanation: "[x^3 + x^2]_0^2 = (2^3 + 2^2) - 0 = 8 + 4 = 12.",
        topic: "Calculus",
      },
    ],
    physics: [
      {
        prompt: "A body accelerates uniformly from rest at 2 m/s^2 for 5 seconds. Calculate the total distance covered.",
        options: ["10 m", "25 m", "50 m", "100 m"],
        answer: "B",
        explanation: "s = ut + ½at² = 0(5) + ½(2)(5²) = 25 m.",
        topic: "Kinematics",
      },
      {
        prompt: "Which of the following modes of thermal energy transfer propagates through a vacuum without a material medium?",
        options: ["Conduction", "Convection", "Radiation", "Advection"],
        answer: "C",
        explanation: "Thermal radiation travels via electromagnetic waves and can propagate through a vacuum.",
        topic: "Heat & Radiation",
      },
      {
        prompt: "An electric kettle rated 2.0 kW is used for 30 minutes. Calculate the electrical energy consumed in kilowatt-hours (kWh).",
        options: ["1.0 kWh", "60.0 kWh", "0.5 kWh", "4.0 kWh"],
        answer: "A",
        explanation: "Energy (kWh) = Power (kW) × Time (h) = 2.0 kW × 0.5 h = 1.0 kWh.",
        topic: "Current Electricity",
      },
      {
        prompt: "Calculate the fundamental frequency of a vibrating string of length 0.5 m under tension if the speed of transverse waves along the string is 200 m/s.",
        options: ["200 Hz", "100 Hz", "400 Hz", "50 Hz"],
        answer: "A",
        explanation: "f = v / (2L) = 200 / (2 × 0.5) = 200 Hz.",
        topic: "Waves & Sound",
      },
      {
        prompt: "What is the angle of refraction when a light ray passes from air into a medium of refractive index \\sqrt{2} at an angle of incidence of 45°?",
        options: ["30°", "60°", "45°", "90°"],
        answer: "A",
        explanation: "Snell's Law: \\sin(i) / \\sin(r) = n => \\sin(45°) / \\sin(r) = \\sqrt{2} => (1/\\sqrt{2}) / \\sqrt{2} = 0.5 => r = 30°.",
        topic: "Optics",
      },
    ],
    chemistry: [
      {
        prompt: "What is the ground state electronic configuration of an atom with atomic number 17?",
        options: ["2, 8, 7", "2, 8, 8", "2, 8, 6", "2, 8, 17"],
        answer: "A",
        explanation: "Chlorine (Z=17) arranges its 17 electrons as K=2, L=8, M=7.",
        topic: "Atomic Structure",
      },
      {
        prompt: "What is the pH of a neutral aqueous solution at 25°C?",
        options: ["0", "7", "14", "1"],
        answer: "B",
        explanation: "At 25°C, [H⁺] = [OH⁻] = 1.0 × 10⁻⁷ mol/dm³, so pH = -log(10⁻⁷) = 7.",
        topic: "Acids, Bases & Salts",
      },
      {
        prompt: "What mass of sodium hydroxide (NaOH) is required to prepare 250 cm³ of a 0.20 mol/dm³ solution? [Na = 23, O = 16, H = 1]",
        options: ["2.0 g", "4.0 g", "8.0 g", "1.0 g"],
        answer: "A",
        explanation: "Molar mass NaOH = 40 g/mol. Moles = 0.20 × 0.25 = 0.05 mol. Mass = 0.05 × 40 = 2.0 g.",
        topic: "Stoichiometry",
      },
      {
        prompt: "Which of the following gases turns acidified potassium dichromate(VI) paper from orange to green?",
        options: ["Sulphur dioxide (SO₂)", "Carbon dioxide (CO₂)", "Hydrogen chloride (HCl)", "Ammonia (NH₃)"],
        answer: "A",
        explanation: "SO₂ reduces orange dichromate ions Cr₂O₇²⁻ to green chromium(III) Cr³⁺ ions.",
        topic: "Redox Reactions",
      },
      {
        prompt: "The IUPAC name of the compound CH₃-CH₂-CH(OH)-CH₃ is:",
        options: ["butan-2-ol", "butan-1-ol", "propan-2-ol", "2-methylpropan-2-ol"],
        answer: "A",
        explanation: "Four-carbon chain with a hydroxyl group (-OH) on carbon-2 is named butan-2-ol.",
        topic: "Organic Chemistry",
      },
    ],
    biology: [
      {
        prompt: "Which cellular organelle is the primary site of ATP synthesis during aerobic cellular respiration?",
        options: ["Mitochondrion", "Ribosome", "Golgi apparatus", "Endoplasmic reticulum"],
        answer: "A",
        explanation: "Mitochondria generate ATP via aerobic oxidative phosphorylation.",
        topic: "Cellular Biology",
      },
      {
        prompt: "In a monohybrid cross between two heterozygous tall pea plants (Tt), what percentage of offspring is expected to be homozygous tall (TT)?",
        options: ["25%", "50%", "75%", "100%"],
        answer: "A",
        explanation: "Tt × Tt yields 1 TT (25%), 2 Tt (50%), 1 tt (25%).",
        topic: "Genetics",
      },
      {
        prompt: "Which blood vessel carries oxygenated blood from the lungs back to the left atrium of the heart?",
        options: ["Pulmonary vein", "Pulmonary artery", "Aorta", "Vena cava"],
        answer: "A",
        explanation: "The pulmonary vein is the exception vessel carrying oxygenated blood from lungs to heart.",
        topic: "Transport System",
      },
      {
        prompt: "Which organelle is responsible for synthesizing proteins in eukaryotic and prokaryotic cells?",
        options: ["Ribosome", "Lysosome", "Vacuole", "Nucleolus"],
        answer: "A",
        explanation: "Ribosomes translate messenger RNA into polypeptide chains.",
        topic: "Cell Structure",
      },
      {
        prompt: "Which enzyme in the human digestive system initiates the breakdown of starch into maltose in the mouth?",
        options: ["Salivary amylase (ptyalin)", "Pepsin", "Trypsin", "Pancreatic lipase"],
        answer: "A",
        explanation: "Salivary amylase hydrolyzes starch into maltose disaccharides in oral cavity.",
        topic: "Nutrition & Digestion",
      },
    ],
  };

  const pool = baseSeeds[subject] || baseSeeds.physics;
  for (let i = 0; i < count; i++) {
    const seed = pool[i % pool.length];
    const itemNum = i + 1;
    items.push({
      id: `q_${subject}_${itemNum}_${Math.random().toString(36).substring(2, 6)}`,
      subject: JAMB_SUBJECT_LABELS[subject],
      topic: seed.topic,
      type: "multiple_choice",
      prompt: count > pool.length && i >= pool.length ? `[Q#${itemNum}] ${seed.prompt}` : seed.prompt,
      options: seed.options.map((text, idx) => ({ key: (["A", "B", "C", "D"][idx]) as Choice, text })),
      answer: seed.answer,
      explanation: seed.explanation,
      status: "verified_past",
      createdAt: new Date().toISOString(),
    });
  }

  return items;
}

export function buildCompleteExamSections(): Record<JambSectionSubject, QuestionBankItem[]> {
  return {
    english: getSubjectSeedQuestions("english", 60),
    mathematics: getSubjectSeedQuestions("mathematics", 40),
    physics: getSubjectSeedQuestions("physics", 40),
    chemistry: getSubjectSeedQuestions("chemistry", 40),
    biology: getSubjectSeedQuestions("biology", 40),
  };
}

/**
 * Assembles a student's authentic 180-question paper based on their candidate subject combination.
 * Standard combination: English (60 Qs) + 3 student-selected electives (40 Qs each) = 180 Qs total.
 */
export function assembleStudentPaper(
  exam: AdminJambExam | undefined,
  studentSubjects: string[] // e.g. ["physics", "chemistry", "mathematics"]
): Array<QuestionBankItem & { subjectId: string }> {
  const defaultElectives: JambSectionSubject[] = ["physics", "chemistry", "mathematics"];
  const candidateElectives: JambSectionSubject[] = (studentSubjects && studentSubjects.length === 3
    ? studentSubjects.map((s) => s.toLowerCase() as JambSectionSubject)
    : defaultElectives) as JambSectionSubject[];

  const chosen4Subjects: JambSectionSubject[] = ["english", ...candidateElectives];
  const assembled: Array<QuestionBankItem & { subjectId: string }> = [];

  const defaultSections = buildCompleteExamSections();

  for (const subjKey of chosen4Subjects) {
    const targetCount = JAMB_SECTION_TARGETS[subjKey] || 40;
    const pool = (exam?.sections?.[subjKey] && exam.sections[subjKey].length > 0)
      ? exam.sections[subjKey]
      : (defaultSections[subjKey] || []);

    if (pool.length === 0) continue;

    for (let i = 0; i < targetCount; i++) {
      const source = pool[i % pool.length];
      if (source) {
        assembled.push({
          ...source,
          id: `${subjKey}_${i + 1}_${source.id || Math.random().toString(36).substring(2, 6)}`,
          subjectId: subjKey,
        });
      }
    }
  }

  return assembled;
}

// Helper to parse pasted plain text questions with options A-D and Answer keys
export function parsePastedQuestionBlock(rawText: string, defaultSubject: string): Omit<QuestionBankItem, "id" | "createdAt" | "status">[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();
  // Split by question number boundaries like "1.", "1)", "Q1.", "Question 1", "2."
  const qBlocks = text.split(/(?=(?:^\s*(?:Q(?:uestion)?\s*)?\d+[.\)]\s+))/im).filter((b) => b.trim());

  const parsedItems: Omit<QuestionBankItem, "id" | "createdAt" | "status">[] = [];

  for (const block of qBlocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // First line or lines before option A
    let promptLines: string[] = [];
    let optionA = "";
    let optionB = "";
    let optionC = "";
    let optionD = "";
    let answerKey: Choice = "A";
    let explanation = "";

    let currentSection: "prompt" | "optA" | "optB" | "optC" | "optD" | "ans" | "exp" = "prompt";

    for (const line of lines) {
      // Check for Answer key line
      const ansMatch = line.match(/^(?:Answer|Ans|Key)[.:\s]*([A-D])/i);
      if (ansMatch) {
        answerKey = ansMatch[1].toUpperCase() as Choice;
        currentSection = "ans";
        continue;
      }

      // Check for Explanation line
      const expMatch = line.match(/^(?:Explanation|Explain|Working)[.:\s]*(.*)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        currentSection = "exp";
        continue;
      }

      // Check for Option A line
      const optAMatch = line.match(/^[A][. \)]\s*(.*)/i);
      if (optAMatch) {
        optionA = optAMatch[1].trim();
        currentSection = "optA";
        continue;
      }

      // Check for Option B line
      const optBMatch = line.match(/^[B][. \)]\s*(.*)/i);
      if (optBMatch) {
        optionB = optBMatch[1].trim();
        currentSection = "optB";
        continue;
      }

      // Check for Option C line
      const optCMatch = line.match(/^[C][. \)]\s*(.*)/i);
      if (optCMatch) {
        optionC = optCMatch[1].trim();
        currentSection = "optC";
        continue;
      }

      // Check for Option D line
      const optDMatch = line.match(/^[D][. \)]\s*(.*)/i);
      if (optDMatch) {
        optionD = optDMatch[1].trim();
        currentSection = "optD";
        continue;
      }

      // Append content based on current section
      if (currentSection === "prompt") {
        // Strip leading number if present
        const cleanPromptLine = line.replace(/^\s*(?:Q(?:uestion)?\s*)?\d+[.\)]\s*/i, "");
        if (cleanPromptLine) promptLines.push(cleanPromptLine);
      } else if (currentSection === "optA") {
        optionA += " " + line;
      } else if (currentSection === "optB") {
        optionB += " " + line;
      } else if (currentSection === "optC") {
        optionC += " " + line;
      } else if (currentSection === "optD") {
        optionD += " " + line;
      } else if (currentSection === "exp") {
        explanation += " " + line;
      }
    }

    const promptText = promptLines.join(" ").trim();
    if (promptText) {
      parsedItems.push({
        subject: defaultSubject,
        topic: `${defaultSubject} General`,
        type: "multiple_choice",
        prompt: promptText,
        options: [
          { key: "A", text: optionA.trim() || "Option A" },
          { key: "B", text: optionB.trim() || "Option B" },
          { key: "C", text: optionC.trim() || "Option C" },
          { key: "D", text: optionD.trim() || "Option D" },
        ],
        answer: answerKey,
        explanation: explanation.trim() || undefined,
      });
    }
  }

  return parsedItems;
}

// Initial Admin Exams Seed - Active weekly examination available now for testing
export function createActiveWeeklyExam(): AdminJambExam {
  const now = new Date();
  const startAt = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // 2 hours ago (active now)
  const endAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days from now
  const id = "weekly_active_current";

  return {
    id,
    type: "weekly_jamb",
    title: "Weekly JAMB CBT Examination · Week 1",
    weekOrPeriod: `Week 1 · ${now.toLocaleString("en-NG", { month: "short", year: "numeric" })}`,
    instructions:
      "Official 180-question 4-subject UTME examination simulation. Includes Use of English (60 questions) plus your 3 selected subjects (40 questions each). Strict 120-minute timer.",
    durationMinutes: 120,
    startAt,
    endAt,
    status: "published",
    createdAt: startAt,
    updatedAt: startAt,
    sections: buildCompleteExamSections(),
  };
}

const SEED_ADMIN_EXAMS: AdminJambExam[] = [createActiveWeeklyExam()];

type CbtStoreState = {
  adminExams: AdminJambExam[];
  questions: QuestionBankItem[];
  weeklyExams: WeeklyCbtExam[];
  auditLogs: ExamAuditLogItem[];

  addAuditLog: (log: Omit<ExamAuditLogItem, "id" | "date">) => void;

  // Admin Exam Operations
  createWeeklyJambExam: (data?: Partial<AdminJambExam>) => string;
  createNextWeekExam: (data?: Partial<AdminJambExam>) => string;
  scheduleAdminExam: (id: string, startAt: string, endAt: string, markScheduled?: boolean) => { success: boolean; errors: ValidationError[] };
  cancelScheduledExam: (id: string) => void;
  createFullJambMock: (data?: Partial<AdminJambExam>) => string;
  updateAdminExam: (id: string, updates: Partial<AdminJambExam>) => void;
  deleteAdminExam: (id: string) => void;
  publishAdminExam: (id: string) => { success: boolean; errors: ValidationError[] };
  markExamAvailable: (id: string) => void;
  populateTemplateQuestions: (examId: string, section: JambSectionSubject) => void;

  // Section Question Operations
  addQuestionToSection: (examId: string, section: JambSectionSubject, question: Omit<QuestionBankItem, "id" | "createdAt" | "status">) => string;
  bulkAddQuestionsToSection: (examId: string, section: JambSectionSubject, questions: Omit<QuestionBankItem, "id" | "createdAt" | "status">[]) => void;
  updateQuestionInSection: (examId: string, section: JambSectionSubject, questionId: string, updates: Partial<QuestionBankItem>) => void;
  deleteQuestionFromSection: (examId: string, section: JambSectionSubject, questionId: string) => void;
  duplicateQuestionInSection: (examId: string, section: JambSectionSubject, questionId: string) => void;

  // General Question Bank items
  addQuestion: (item: Omit<QuestionBankItem, "id" | "createdAt">) => string;
  updateQuestionStatus: (id: string, status: QuestionOriginStatus) => void;
  deleteQuestion: (id: string) => void;

  // Legacy Weekly CBT Schedule
  createWeeklyExam: (exam: Omit<WeeklyCbtExam, "id" | "createdAt">) => string;
  updateWeeklyExamStatus: (id: string, status: WeeklyCbtStatus) => void;
  deleteWeeklyExam: (id: string) => void;
};

// Helper: sync AdminJambExams into weeklyExams for student-facing routes
function syncWeeklyExams(adminExams: AdminJambExam[]): WeeklyCbtExam[] {
  return adminExams.map((e) => {
    const flattened = [
      ...(e.sections.english || []),
      ...(e.sections.mathematics || []),
      ...(e.sections.physics || []),
      ...(e.sections.chemistry || []),
      ...(e.sections.biology || []),
    ];

    const isPub = isExamPublishedOrAvailable(e.status);

    return {
      id: e.id,
      title: e.title,
      description: e.instructions,
      subject: e.type === "weekly_jamb" ? "5-Subject JAMB Master" : "Full JAMB National Mock",
      questionIds: flattened.map((q) => q.id),
      questions: flattened,
      durationMinutes: e.durationMinutes || 120,
      startAt: e.startAt,
      endAt: e.endAt,
      status: (isPub ? "open" : e.status === "draft" ? "draft" : "closed") as WeeklyCbtStatus,
      createdAt: e.createdAt,
      sections: e.sections,
    };
  });
}

function getOffsetDate(days: number, hours: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export const useCbtStore = create<CbtStoreState>()(
  persist(
    (set, get) => ({
      adminExams: SEED_ADMIN_EXAMS,
      questions: [],
      weeklyExams: syncWeeklyExams(SEED_ADMIN_EXAMS),
      auditLogs: [
        {
          id: "audit_init_1",
          examId: "weekly_active_current",
          examTitle: "Weekly JAMB CBT Examination · Week 1",
          action: "created",
          date: new Date().toISOString(),
          newValue: "Active seed examination",
          adminName: "Lead Administrator",
        },
      ],

      addAuditLog: (log) => {
        const item: ExamAuditLogItem = {
          ...log,
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: new Date().toISOString(),
        };
        set({ auditLogs: [item, ...get().auditLogs] });
      },

      createWeeklyJambExam: (data = {}) => {
        const id = `weekly_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();
        const newExam: AdminJambExam = {
          id,
          type: "weekly_jamb",
          title: data.title || "Weekly JAMB CBT Examination #1",
          weekOrPeriod: data.weekOrPeriod || `Week ${get().adminExams.filter((e) => e.type === "weekly_jamb").length + 1} · ${new Date().toLocaleString("en-NG", { month: "short", year: "numeric" })}`,
          instructions: data.instructions || "Official 180-question 4-subject UTME examination simulation. Includes Use of English (60 questions) plus your 3 selected subjects (40 questions each). Strict 120-minute timer.",
          durationMinutes: data.durationMinutes || 120,
          startAt: data.startAt || new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          endAt: data.endAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          status: "draft",
          createdAt: now,
          updatedAt: now,
          sections: {
            english: data.sections?.english ? [...data.sections.english] : [],
            mathematics: data.sections?.mathematics ? [...data.sections.mathematics] : [],
            physics: data.sections?.physics ? [...data.sections.physics] : [],
            chemistry: data.sections?.chemistry ? [...data.sections.chemistry] : [],
            biology: data.sections?.biology ? [...data.sections.biology] : [],
          },
        };

        const updatedAdmin = [newExam, ...get().adminExams];
        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
        return id;
      },

      createNextWeekExam: (customData = {}) => {
        const liveExam = getCurrentLiveExam(get().adminExams);
        const nextWeekNum = getNextWeekNumber(get().adminExams);
        const sched = calculateDefaultNextWeekSchedule(liveExam);
        const id = `weekly_week_${nextWeekNum}_${Date.now()}`;
        const now = new Date().toISOString();

        const monthName = new Date(sched.startAt).toLocaleString("en-NG", { month: "short", year: "numeric", timeZone: "Africa/Lagos" });

        const newExam: AdminJambExam = {
          id,
          type: "weekly_jamb",
          title: customData.title || `Weekly JAMB CBT Examination · Week ${nextWeekNum}`,
          weekOrPeriod: customData.weekOrPeriod || `Week ${nextWeekNum} · ${monthName}`,
          instructions: customData.instructions || "Official 180-question 4-subject UTME examination simulation. Strictly timed for 120 minutes with comprehensive question verification.",
          durationMinutes: 120,
          startAt: customData.startAt || sched.startAt,
          endAt: customData.endAt || sched.endAt,
          status: "draft",
          createdAt: now,
          updatedAt: now,
          sections: {
            english: [],
            mathematics: [],
            physics: [],
            chemistry: [],
            biology: [],
          },
        };

        const updatedAdmin = [newExam, ...get().adminExams];
        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
        return id;
      },

      scheduleAdminExam: (id, startAt, endAt, markScheduled = true) => {
        const exam = get().adminExams.find((e) => e.id === id);
        if (!exam) return { success: false, errors: [{ message: "Exam not found" }] };

        if (markScheduled) {
          const errors = validateWeeklyExam(exam);
          const criticalErrors = errors.filter((e) => !e.message.includes("(Recommended:"));
          if (criticalErrors.length > 0) {
            return { success: false, errors: criticalErrors };
          }
        }

        const isFuture = new Date(startAt).getTime() > Date.now();
        const updatedAdmin = get().adminExams.map((e) =>
          e.id === id
            ? {
                ...e,
                startAt,
                endAt,
                status: (markScheduled ? (isFuture ? "scheduled" : "published") : e.status) as ExamStatus,
                updatedAt: new Date().toISOString(),
              }
            : e
        );

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });

        return { success: true, errors: [] };
      },

      cancelScheduledExam: (id) => {
        const updatedAdmin = get().adminExams.map((e) =>
          e.id === id
            ? {
                ...e,
                status: "draft" as const,
                updatedAt: new Date().toISOString(),
              }
            : e
        );

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      createFullJambMock: (data = {}) => {
        const id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();
        const newExam: AdminJambExam = {
          id,
          type: "full_jamb_mock",
          title: data.title || "Full JAMB UTME National Mock",
          weekOrPeriod: data.weekOrPeriod || "Official Mock Series 1",
          instructions: data.instructions || "Official 180-question 4-subject JAMB simulation. Strict 2-hour duration. Use of English (60 questions) plus 3 registered subjects (40 questions each).",
          durationMinutes: 120,
          startAt: data.startAt || getOffsetDate(0),
          endAt: data.endAt || getOffsetDate(30),
          status: "draft",
          createdAt: now,
          updatedAt: now,
          sections: {
            english: [],
            mathematics: [],
            physics: [],
            chemistry: [],
            biology: [],
          },
          mockConfig: {
            totalQuestions: 180,
            subjects: ["english", "physics", "chemistry", "mathematics"],
          },
        };

        const updatedAdmin = [newExam, ...get().adminExams];
        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
        return id;
      },

      updateAdminExam: (id, updates) => {
        const updatedAdmin = get().adminExams.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
        );
        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      deleteAdminExam: (id) => {
        const updatedAdmin = get().adminExams.filter((e) => e.id !== id);
        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      publishAdminExam: (id) => {
        const exam = get().adminExams.find((e) => e.id === id);
        if (!exam) return { success: false, errors: [{ message: "Exam not found" }] };

        const errors = validateWeeklyExam(exam);
        const criticalErrors = errors.filter((e) => !e.message.includes("(Recommended:"));
        if (criticalErrors.length > 0) {
          return { success: false, errors: criticalErrors };
        }

        const nowMs = Date.now();
        const isFuture = exam.startAt && new Date(exam.startAt).getTime() > nowMs;
        const newStatus = isFuture ? ("scheduled" as const) : ("published" as const);
        const finalStartAt = exam.startAt || new Date(nowMs - 2 * 3600 * 1000).toISOString();
        const finalEndAt = exam.endAt || new Date(new Date(finalStartAt).getTime() + 7 * 24 * 3600 * 1000).toISOString();

        const updatedAdmin = get().adminExams.map((e) =>
          e.id === id
            ? {
                ...e,
                status: newStatus,
                startAt: finalStartAt,
                endAt: finalEndAt,
                updatedAt: new Date().toISOString(),
              }
            : e
        );

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });

        return { success: true, errors: [] };
      },

      markExamAvailable: (id) => {
        const nowMs = Date.now();
        const updatedAdmin = get().adminExams.map((e) =>
          e.id === id
            ? {
                ...e,
                status: "published" as const,
                startAt: new Date(nowMs - 2 * 3600 * 1000).toISOString(),
                endAt: new Date(nowMs + 7 * 24 * 3600 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : e
        );

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      populateTemplateQuestions: (examId, section) => {
        const targetCount = JAMB_SECTION_TARGETS[section] || 40;
        const seedQuestions = getSubjectSeedQuestions(section, targetCount);

        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          const currentList = e.sections[section] || [];
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: [...seedQuestions, ...currentList],
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      addQuestionToSection: (examId, section, question) => {
        const qId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newItem: QuestionBankItem = {
          ...question,
          id: qId,
          status: "ai_generated_approved",
          createdAt: new Date().toISOString(),
        };

        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          const currentList = e.sections[section] || [];
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: [newItem, ...currentList],
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });

        return qId;
      },

      bulkAddQuestionsToSection: (examId, section, questions) => {
        const itemsWithIds: QuestionBankItem[] = questions.map((q, idx) => ({
          ...q,
          id: `q_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          status: "uploaded_approved",
          createdAt: new Date().toISOString(),
        }));

        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          const currentList = e.sections[section] || [];
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: [...itemsWithIds, ...currentList],
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      updateQuestionInSection: (examId, section, questionId, updates) => {
        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          const currentList = e.sections[section] || [];
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: currentList.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      deleteQuestionFromSection: (examId, section, questionId) => {
        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          const currentList = e.sections[section] || [];
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: currentList.filter((q) => q.id !== questionId),
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      duplicateQuestionInSection: (examId, section, questionId) => {
        const exam = get().adminExams.find((e) => e.id === examId);
        if (!exam) return;
        const currentList = exam.sections[section] || [];
        const original = currentList.find((q) => q.id === questionId);
        if (!original) return;

        const duplicated: QuestionBankItem = {
          ...original,
          id: `q_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          prompt: `${original.prompt} (Copy)`,
          createdAt: new Date().toISOString(),
        };

        const updatedAdmin = get().adminExams.map((e) => {
          if (e.id !== examId) return e;
          return {
            ...e,
            sections: {
              ...e.sections,
              [section]: [duplicated, ...currentList],
            },
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          adminExams: updatedAdmin,
          weeklyExams: syncWeeklyExams(updatedAdmin),
        });
      },

      addQuestion: (item) => {
        const id = `qb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newItem: QuestionBankItem = {
          ...item,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ questions: [newItem, ...state.questions] }));
        return id;
      },

      updateQuestionStatus: (id, status) => {
        set((state) => ({
          questions: state.questions.map((q) => (q.id === id ? { ...q, status } : q)),
        }));
      },

      deleteQuestion: (id) => {
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== id),
        }));
      },

      createWeeklyExam: (exam) => {
        const id = `weekly_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newExam: WeeklyCbtExam = {
          ...exam,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ weeklyExams: [newExam, ...state.weeklyExams] }));
        return id;
      },

      updateWeeklyExamStatus: (id, status) => {
        set((state) => ({
          weeklyExams: state.weeklyExams.map((e) => (e.id === id ? { ...e, status } : e)),
        }));
      },

      deleteWeeklyExam: (id) => {
        set((state) => ({
          weeklyExams: state.weeklyExams.filter((e) => e.id !== id),
        }));
      },
    }),
    {
      name: "richmirabel-cbt-store",
      version: 5,
      migrate: (persistedState: any, version: number) => {
        const s = persistedState as Partial<CbtStoreState>;
        const existingAdmin = Array.isArray(s?.adminExams) ? s.adminExams : [];

        let adminExams: AdminJambExam[];
        const nowMs = Date.now();
        if (existingAdmin.length === 0) {
          adminExams = SEED_ADMIN_EXAMS;
        } else {
          adminExams = existingAdmin.map((e) => {
            if (e.type === "weekly_jamb") {
              return {
                ...e,
                status: "published" as const,
                startAt: new Date(nowMs - 2 * 3600 * 1000).toISOString(),
                endAt: new Date(nowMs + 7 * 24 * 3600 * 1000).toISOString(),
              };
            }
            return e;
          });
        }

        return {
          adminExams,
          questions: Array.isArray(s?.questions) ? s.questions : [],
          weeklyExams: syncWeeklyExams(adminExams),
        };
      },
    }
  )
);


