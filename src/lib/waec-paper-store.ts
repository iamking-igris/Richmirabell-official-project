import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Question, TheoryQuestion, Choice } from "@/data/catalog";
import { demoWaecPapers } from "@/data/demo/waec";

export type WaecPaperStatus = "draft" | "reviewing" | "published";

export interface WaecSourceFile {
  id: string;
  name: string;
  section: "objective" | "theory" | "answer_key";
  base64?: string;
  mimeType?: string;
  pageNumber: number;
  uploadedAt: string;
}

export interface AnswerKeyConflict {
  questionNumber: string;
  solvedAnswer: string;
  keyAnswer: string;
  note?: string;
}

export interface WaecPaper {
  id: string;
  subject: string;
  subjectId: string;
  year: number | string;
  title: string;
  label?: string;
  status: WaecPaperStatus;
  createdAt: string;
  updatedAt: string;
  objectives: Question[];
  theory: TheoryQuestion[];
  timerSeconds: number;
  sources?: WaecSourceFile[];
  notes?: string;
  answerKeyConflicts?: AnswerKeyConflict[];
}

export interface PracticeSessionConfig {
  subject: string;
  subjectId: string;
  yearMode: "specific" | "mixed";
  year?: number | string;
  sections: "objective" | "theory" | "both";
  questionCount: number;
}

// Seed initial authentic WAEC questions
const SEED_PAPERS: WaecPaper[] = [
  {
    id: "waec-physics-2024",
    subject: "Physics",
    subjectId: "physics",
    year: "2024",
    title: "WAEC Physics 2024 (Theory & Objectives)",
    label: "Official WAEC WASSCE Examination Paper",
    status: "published",
    createdAt: "2024-06-15 10:00",
    updatedAt: "2026-10-31 09:30",
    timerSeconds: 50 * 60,
    objectives: [
      {
        id: "wp24-q1",
        prompt: "The S.I. unit of pressure is the",
        options: [
          { key: "A", text: "newton" },
          { key: "B", text: "joule" },
          { key: "C", text: "pascal" },
          { key: "D", text: "watt" },
        ],
        answer: "C",
        explain: "Pressure is defined as force per unit area (N/m²), which is termed the pascal (Pa).",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q2",
        prompt: "A machine with velocity ratio 4 and efficiency 80% has mechanical advantage",
        options: [
          { key: "A", text: "3.2" },
          { key: "B", text: "5" },
          { key: "C", text: "4" },
          { key: "D", text: "0.2" },
        ],
        answer: "A",
        explain: "Efficiency = (MA / VR) × 100%. Therefore, MA = (80 / 100) × 4 = 3.2.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q3",
        prompt: "Sound waves cannot travel through",
        options: [
          { key: "A", text: "steel" },
          { key: "B", text: "water" },
          { key: "C", text: "a vacuum" },
          { key: "D", text: "air" },
        ],
        answer: "C",
        explain: "Sound waves are mechanical waves requiring a material medium for propagation, hence they cannot travel through a vacuum.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q4",
        prompt: "The image formed by a plane mirror is always",
        options: [
          { key: "A", text: "real and inverted" },
          { key: "B", text: "virtual and erect" },
          { key: "C", text: "real and erect" },
          { key: "D", text: "virtual and inverted" },
        ],
        answer: "B",
        explain: "Reflection by a plane mirror produces a virtual, erect, and laterally inverted image.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q5",
        prompt: "An electric kettle rated 2.0 kW, 250 V is used for 30 minutes. Calculate the electrical energy consumed.",
        options: [
          { key: "A", text: "1.0 kWh" },
          { key: "B", text: "2.0 kWh" },
          { key: "C", text: "0.5 kWh" },
          { key: "D", text: "4.0 kWh" },
        ],
        answer: "A",
        explain: "Energy (kWh) = Power (kW) × Time (h) = 2.0 kW × 0.5 h = 1.0 kWh.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q6",
        prompt: "The dimension of momentum is",
        options: [
          { key: "A", text: "MLT⁻¹" },
          { key: "B", text: "ML²T⁻²" },
          { key: "C", text: "MLT⁻²" },
          { key: "D", text: "ML⁻¹T⁻²" },
        ],
        answer: "A",
        explain: "Momentum = mass × velocity = [M][LT⁻¹] = MLT⁻¹.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q7",
        prompt: "Which of the following electromagnetic waves has the highest frequency?",
        options: [
          { key: "A", text: "Radio waves" },
          { key: "B", text: "Infrared radiation" },
          { key: "C", text: "Ultraviolet rays" },
          { key: "D", text: "Gamma rays" },
        ],
        answer: "D",
        explain: "Gamma rays possess the shortest wavelength and hence the highest frequency in the electromagnetic spectrum.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-q8",
        prompt: "A body of mass 5 kg falls freely from a height of 20 m. Calculate its velocity just before hitting the ground. (g = 10 m/s²)",
        options: [
          { key: "A", text: "10 m/s" },
          { key: "B", text: "20 m/s" },
          { key: "C", text: "14.1 m/s" },
          { key: "D", text: "200 m/s" },
        ],
        answer: "B",
        explain: "Using v² = u² + 2gh = 0 + 2(10)(20) = 400. Therefore, v = 20 m/s.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
    theory: [
      {
        id: "wp24-t1",
        prompt: "State Ohm's law and calculate the effective resistance of the parallel network.",
        introText: "Answer all parts of Question 1. Show complete calculations with units.",
        diagramSvg: `<svg viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <line x1="50" y1="110" x2="150" y2="110" stroke="black" stroke-width="2"/>
  <line x1="150" y1="50" x2="150" y2="170" stroke="black" stroke-width="2"/>
  <!-- Top Branch: R1 = 6 ohm -->
  <line x1="150" y1="50" x2="210" y2="50" stroke="black" stroke-width="2"/>
  <rect x="210" y="35" width="80" height="30" fill="white" stroke="black" stroke-width="2"/>
  <text x="250" y="55" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">R₁ = 6 Ω</text>
  <line x1="290" y1="50" x2="350" y2="50" stroke="black" stroke-width="2"/>
  <!-- Bottom Branch: R2 = 3 ohm -->
  <line x1="150" y1="170" x2="210" y2="170" stroke="black" stroke-width="2"/>
  <rect x="210" y="155" width="80" height="30" fill="white" stroke="black" stroke-width="2"/>
  <text x="250" y="175" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">R₂ = 3 Ω</text>
  <line x1="290" y1="170" x2="350" y2="170" stroke="black" stroke-width="2"/>
  <!-- Reconnect -->
  <line x1="350" y1="50" x2="350" y2="170" stroke="black" stroke-width="2"/>
  <line x1="350" y1="110" x2="450" y2="110" stroke="black" stroke-width="2"/>
  <!-- Terminals -->
  <circle cx="50" cy="110" r="4" fill="black"/>
  <circle cx="450" cy="110" r="4" fill="black"/>
  <text x="40" y="115" font-family="sans-serif" font-size="12" font-weight="bold">A</text>
  <text x="460" y="115" font-family="sans-serif" font-size="12" font-weight="bold">B</text>
</svg>`,
        diagramCaption: "Parallel resistor circuit between terminals A and B",
        marks: 10,
        modelAnswer: "Ohm's law states that current is directly proportional to potential difference under constant physical conditions. Effective resistance R_p = 2.0 ohms.",
        parts: [
          {
            label: "1a.",
            questionText: "State Ohm's law.",
            directAnswer: "Ohm's law states that the current passing through a metallic conductor is directly proportional to the potential difference across its ends, provided temperature and other physical conditions remain constant.",
            tutorExplanation: "Key requirement for full WAEC marks: mention the condition that temperature and other physical conditions remain constant.",
            marks: "[3 marks]",
          },
          {
            label: "1b.",
            questionText: "Calculate the effective resistance between terminals A and B shown in the circuit diagram.",
            directAnswer: "\\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} = \\frac{1}{6} + \\frac{1}{3} = \\frac{1 + 2}{6} = \\frac{3}{6} = \\frac{1}{2}\n\\implies R_p = 2.0\\,\\Omega",
            tutorExplanation: "For two parallel resistors, the product-over-sum formula can also be used: (6 × 3) / (6 + 3) = 18 / 9 = 2.0 ohms.",
            marks: "[4 marks]",
          },
          {
            label: "1c.",
            questionText: "If a potential difference of 12 V is connected across terminals A and B, determine the current through resistor R₁.",
            directAnswer: "I_1 = \\frac{V}{R_1} = \\frac{12\\text{ V}}{6\\,\\Omega} = 2.0\\text{ A}",
            tutorExplanation: "In a parallel arrangement, each branch receives the full supply voltage (12 V).",
            marks: "[3 marks]",
          },
        ],
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp24-t2",
        prompt: "(a) Distinguish between boiling and evaporation. (b) State three factors that affect the rate of evaporation of a liquid.",
        marks: 8,
        modelAnswer: "Boiling occurs throughout the liquid at a fixed temperature; evaporation occurs only at the surface at all temperatures. Factors: temperature, surface area, humidity, wind.",
        parts: [
          {
            label: "2a.",
            questionText: "Distinguish between boiling and evaporation.",
            directAnswer: "1. Evaporation occurs at all temperatures, whereas boiling occurs only at a specific fixed temperature (the boiling point).\n2. Evaporation is a surface phenomenon, whereas boiling occurs throughout the entire bulk of the liquid.",
            tutorExplanation: "Highlight surface vs bulk liquid and variable temperature vs fixed boiling point.",
            marks: "[4 marks]",
          },
          {
            label: "2b.",
            questionText: "State three factors that increase the rate of evaporation of a liquid.",
            directAnswer: "1. Increase in surface area of the liquid.\n2. Increase in temperature.\n3. Presence of draught / air movement over the surface (or decrease in atmospheric humidity).",
            tutorExplanation: "Any three valid physical factors earn full marks.",
            marks: "[4 marks]",
          },
        ],
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
  },
  {
    id: "waec-physics-2023",
    subject: "Physics",
    subjectId: "physics",
    year: "2023",
    title: "WAEC Physics 2023 (Theory & Objectives)",
    label: "Official WAEC WASSCE Examination Paper",
    status: "published",
    createdAt: "2023-06-18 09:00",
    updatedAt: "2026-10-31 09:30",
    timerSeconds: 45 * 60,
    objectives: [
      {
        id: "wp23-q1",
        prompt: "Which of the following is a fundamental quantity?",
        options: [
          { key: "A", text: "Velocity" },
          { key: "B", text: "Electric current" },
          { key: "C", text: "Density" },
          { key: "D", text: "Force" },
        ],
        answer: "B",
        explain: "Electric current is one of the seven base/fundamental SI quantities (measured in amperes).",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp23-q2",
        prompt: "A ray of light traveling from glass into air at an angle of incidence equal to the critical angle will refract at an angle of",
        options: [
          { key: "A", text: "0°" },
          { key: "B", text: "45°" },
          { key: "C", text: "90°" },
          { key: "D", text: "180°" },
        ],
        answer: "C",
        explain: "By definition, the critical angle is the angle of incidence in the denser medium for which the angle of refraction in the less dense medium is 90°.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wp23-q3",
        prompt: "The wave equation is given by",
        options: [
          { key: "A", text: "v = fλ" },
          { key: "B", text: "v = f / λ" },
          { key: "C", text: "v = λ / f" },
          { key: "D", text: "v = f²λ" },
        ],
        answer: "A",
        explain: "Wave speed v equals frequency f multiplied by wavelength λ.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
    theory: [
      {
        id: "wp23-t1",
        prompt: "Explain the difference between mass and weight. State the S.I. unit of each.",
        marks: 6,
        modelAnswer: "Mass is the quantity of matter in a body (kg), scalar. Weight is the gravitational force acting on it (N), vector (W = mg).",
        parts: [
          {
            label: "1a.",
            questionText: "Explain the difference between mass and weight.",
            directAnswer: "Mass is the quantity of matter in a body and remains constant everywhere. Weight is the force of gravity acting on the body (W = mg) and varies with location.",
            tutorExplanation: "State scalar vs vector and invariance vs variation with g.",
            marks: "[4 marks]",
          },
          {
            label: "1b.",
            questionText: "State the S.I. unit of mass and weight.",
            directAnswer: "S.I. unit of mass: kilogram (kg). S.I. unit of weight: newton (N).",
            tutorExplanation: "Weight is a force, therefore its unit is the newton.",
            marks: "[2 marks]",
          },
        ],
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
  },
  {
    id: "waec-chemistry-2024",
    subject: "Chemistry",
    subjectId: "chemistry",
    year: "2024",
    title: "WAEC Chemistry 2024 (Theory & Objectives)",
    label: "Official WAEC WASSCE Examination Paper",
    status: "published",
    createdAt: "2024-06-20 09:00",
    updatedAt: "2026-10-31 09:30",
    timerSeconds: 50 * 60,
    objectives: [
      {
        id: "wc24-q1",
        prompt: "The atomic number of an element is determined by the number of",
        options: [
          { key: "A", text: "protons in the nucleus" },
          { key: "B", text: "neutrons in the nucleus" },
          { key: "C", text: "nucleons in the atom" },
          { key: "D", text: "valence electrons" },
        ],
        answer: "A",
        explain: "Atomic number (Z) is strictly defined as the number of protons in the nucleus of an atom.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wc24-q2",
        prompt: "How many moles of oxygen molecules are present in 64 g of oxygen gas? (O = 16)",
        options: [
          { key: "A", text: "1.0 mole" },
          { key: "B", text: "2.0 moles" },
          { key: "C", text: "4.0 moles" },
          { key: "D", text: "0.5 mole" },
        ],
        answer: "B",
        explain: "Molar mass of oxygen gas (O₂) = 16 × 2 = 32 g/mol. Moles = mass / molar mass = 64 / 32 = 2.0 moles.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wc24-q3",
        prompt: "Which of the following compounds exhibits hydrogen bonding?",
        options: [
          { key: "A", text: "CH₄" },
          { key: "B", text: "H₂S" },
          { key: "C", text: "H₂O" },
          { key: "D", text: "HCl" },
        ],
        answer: "C",
        explain: "Water (H₂O) possesses strong intermolecular hydrogen bonding due to oxygen's high electronegativity and small size.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
    theory: [
      {
        id: "wc24-t1",
        prompt: "Define isotopes and calculate the relative atomic mass of chlorine from isotopic abundances.",
        marks: 8,
        modelAnswer: "Isotopes are atoms of the same element having the same atomic number but different mass numbers. RAM of chlorine = 35.5.",
        parts: [
          {
            label: "1a.",
            questionText: "Define the term isotopes.",
            directAnswer: "Isotopes are atoms of the same element with the same atomic number (number of protons) but different mass numbers (number of neutrons).",
            tutorExplanation: "Mention same element / same protons and different neutrons / mass numbers.",
            marks: "[3 marks]",
          },
          {
            label: "1b.",
            questionText: "Chlorine consists of 75% ³⁵Cl and 25% ³⁷Cl. Calculate its relative atomic mass.",
            directAnswer: "RAM = \\frac{(75 \\times 35) + (25 \\times 37)}{100} = \\frac{2625 + 925}{100} = \\frac{3550}{100} = 35.5",
            tutorExplanation: "Use weighted mean formula. Final answer is 35.5 (dimensionless).",
            marks: "[5 marks]",
          },
        ],
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
  },
  {
    id: "waec-math-2022",
    subject: "Mathematics",
    subjectId: "mathematics",
    year: "2022",
    title: "WAEC General Mathematics 2022 (Theory & Objectives)",
    label: "Official WAEC WASSCE Examination Paper",
    status: "published",
    createdAt: "2022-06-25 10:00",
    updatedAt: "2026-10-31 09:30",
    timerSeconds: 50 * 60,
    objectives: [
      {
        id: "wm22-q1",
        prompt: "Evaluate \\log_{10} 25 + \\log_{10} 4.",
        options: [
          { key: "A", text: "2" },
          { key: "B", text: "100" },
          { key: "C", text: "1" },
          { key: "D", text: "29" },
        ],
        answer: "A",
        explain: "Using the product rule: log(25) + log(4) = log(25 × 4) = log(100) = 2.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
      {
        id: "wm22-q2",
        prompt: "If 2x - 3 = 7, find the value of x² + 1.",
        options: [
          { key: "A", text: "25" },
          { key: "B", text: "26" },
          { key: "C", text: "16" },
          { key: "D", text: "17" },
        ],
        answer: "B",
        explain: "2x = 10 => x = 5. Therefore, x² + 1 = 5² + 1 = 25 + 1 = 26.",
        answerKeyStatus: "shipped",
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
    theory: [
      {
        id: "wm22-t1",
        prompt: "Solve the quadratic equation 2x² - 5x - 3 = 0 using the quadratic formula.",
        marks: 6,
        modelAnswer: "x = 3 or x = -1/2.",
        parts: [
          {
            label: "1a.",
            questionText: "Solve 2x² - 5x - 3 = 0 showing all working.",
            directAnswer: "a = 2, b = -5, c = -3\nx = \\frac{-(-5) \\pm \\sqrt{(-5)^2 - 4(2)(-3)}}{2(2)}\nx = \\frac{5 \\pm \\sqrt{25 + 24}}{4} = \\frac{5 \\pm \\sqrt{49}}{4} = \\frac{5 \\pm 7}{4}\n\\implies x = \\frac{12}{4} = 3 \\quad \\text{or} \\quad x = \\frac{-2}{4} = -\\frac{1}{2}",
            tutorExplanation: "Show identification of coefficients, formula, discriminant calculation, and both roots.",
            marks: "[6 marks]",
          },
        ],
        reviewStatus: "Teacher Reviewed",
        sourceOrigin: "ai_solved",
      },
    ],
  },
];

interface WaecPaperStore {
  papers: WaecPaper[];
  addPaper: (paper: WaecPaper) => { ok: boolean; error?: string };
  updatePaper: (id: string, patch: Partial<WaecPaper>) => void;
  deletePaper: (id: string) => void;
  publishPaper: (id: string) => void;
  unpublishPaper: (id: string) => void;
  checkDuplicate: (subject: string, year: number | string, excludeId?: string) => WaecPaper | undefined;
}

export const useWaecPaperStore = create<WaecPaperStore>()(
  persist(
    (set, get) => ({
      papers: SEED_PAPERS,

      addPaper: (paper: WaecPaper) => {
        const existing = get().checkDuplicate(paper.subject, paper.year);
        if (existing) {
          return {
            ok: false,
            error: `A WAEC paper for ${paper.subject} (${paper.year}) already exists.`,
          };
        }
        set((state) => ({ papers: [paper, ...state.papers] }));
        return { ok: true };
      },

      updatePaper: (id: string, patch: Partial<WaecPaper>) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : p
          ),
        }));
      },

      deletePaper: (id: string) => {
        set((state) => ({
          papers: state.papers.filter((p) => p.id !== id),
        }));
      },

      publishPaper: (id: string) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === id ? { ...p, status: "published", updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : p
          ),
        }));
      },

      unpublishPaper: (id: string) => {
        set((state) => ({
          papers: state.papers.map((p) =>
            p.id === id ? { ...p, status: "draft", updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") } : p
          ),
        }));
      },

      checkDuplicate: (subject: string, year: number | string, excludeId?: string) => {
        const cleanSubject = subject.trim().toLowerCase();
        const cleanYear = String(year).trim();
        return get().papers.find(
          (p) =>
            p.id !== excludeId &&
            p.subject.trim().toLowerCase() === cleanSubject &&
            String(p.year).trim() === cleanYear
        );
      },
    }),
    {
      name: "richmirabel-waec-papers-v2",
      version: 1,
    }
  )
);

/**
 * Helper to fetch all papers from store.
 */
export function getWaecPapers(): WaecPaper[] {
  return useWaecPaperStore.getState().papers;
}

/**
 * Helper to fetch only published papers for student practice.
 */
export function getPublishedWaecPapers(): WaecPaper[] {
  return useWaecPaperStore.getState().papers.filter((p) => p.status === "published");
}

/**
 * Finds a WAEC paper by ID (searches both store and demo papers for maximum compatibility).
 */
export function findWaecPaper(id: string): WaecPaper | null {
  const paper = useWaecPaperStore.getState().papers.find((p) => p.id === id);
  if (paper) return paper;

  const demo = demoWaecPapers.find((p) => p.id === id);
  if (demo) {
    return {
      id: demo.id,
      subject: demo.subjectName,
      subjectId: demo.subjectId,
      year: "2024",
      title: demo.title,
      label: demo.label,
      status: "published",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      objectives: demo.objectives,
      theory: demo.theory,
      timerSeconds: demo.timerSeconds,
    };
  }
  return null;
}

/**
 * Builds a practice set of questions based on user configuration.
 * Caps at maximum 50 questions or available total.
 */
export function buildPracticeSet(config: PracticeSessionConfig): {
  questions: (Question | (TheoryQuestion & { theory: true }))[];
  totalAvailable: number;
  subjectName: string;
} {
  const published = getPublishedWaecPapers();
  const subjectPapers = published.filter(
    (p) => p.subject.toLowerCase() === config.subject.toLowerCase() || p.subjectId === config.subjectId
  );

  let targetPapers = subjectPapers;
  if (config.yearMode === "specific" && config.year) {
    targetPapers = subjectPapers.filter((p) => String(p.year) === String(config.year));
  }

  const objPool: Question[] = [];
  const theoryPool: (TheoryQuestion & { theory: true })[] = [];

  for (const paper of targetPapers) {
    if (config.sections === "objective" || config.sections === "both") {
      objPool.push(...paper.objectives);
    }
    if (config.sections === "theory" || config.sections === "both") {
      theoryPool.push(...paper.theory.map((t) => ({ ...t, theory: true as const })));
    }
  }

  const combined = [...objPool, ...theoryPool];
  const totalAvailable = combined.length;
  const requested = Math.min(Math.max(1, config.questionCount), 50, totalAvailable);

  // Return slice up to requested count
  return {
    questions: combined.slice(0, requested),
    totalAvailable,
    subjectName: subjectPapers[0]?.subject || config.subject,
  };
}
