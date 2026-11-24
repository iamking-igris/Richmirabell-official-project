import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dns from "node:dns";
import net from "node:net";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Prefer IPv4/stable connect behavior to avoid IPv6-related timeouts in some environments.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}
try {
  if (typeof net.setDefaultAutoSelectFamily === "function") {
    net.setDefaultAutoSelectFamily(false);
  }
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `You are an expert educational OCR engine for the Richmirabel app. 
Your job is to look at this handwritten note, understand the layout, and convert it into a structured JSON format.

Use these visual cues to categorize the text:
1. "title": The largest, most prominent text at the top of the page.
2. "subtitle": A smaller sentence right below the title explaining what the note is about.
3. "meta": Any small text at the top indicating time, date, or questions (e.g., "20 mins").
4. "objectives": If you see a list of goals, learning objectives, OR a list of variable definitions / symbol meanings (e.g., "u = initial velocity", "v = final velocity"), put each item into the "items" array of an "objectives" block.
5. "heading": Words that are underlined, written larger, or isolated on their own line.
6. "paragraph": Standard blocks of handwritten text. Always convert inline math symbols and expressions to KaTeX LaTeX notation (e.g., \\mu, F_{12}, \\alpha, \\frac{a}{b}, v_0). When transcribing variable definitions or symbol meanings inside a paragraph, write each variable definition on a new line (e.g. "u = initial velocity\\nv = final velocity\\na = acceleration") so it can be formatted as a structured definition list.
7. "formula": Any standalone mathematical equation. YOU MUST convert these to clean KaTeX-compatible LaTeX (e.g., s = \\frac{u+v}{2} t, E_k = \\frac{1}{2}mv^2, v = f \\lambda). Do NOT wrap in markdown backticks or dollar signs.

Output MUST strictly match this JSON structure:
{
  "subject": "String",
  "topic": "String",
  "title": "String",
  "subtitle": "String",
  "meta": "String",
  "blocks": [
    { "id": "gen-uuid-1", "type": "objectives", "items": ["Goal 1", "u = initial velocity", "v = final velocity"] },
    { "id": "gen-uuid-2", "type": "heading", "text": "Heading text" },
    { "id": "gen-uuid-3", "type": "paragraph", "text": "Paragraph text with inline math \\mu and F_{12}" },
    { "id": "gen-uuid-4", "type": "formula", "latex": "s = \\frac{u+v}{2} t" }
  ]
}

CRITICAL RULES:
1. Generate a random unique string for every "id".
2. Return ONLY the raw JSON. No markdown formatting, no backticks.
3. If handwriting is messy, make your best educational guess based on context.`;

import fs from "fs";

const PERMANENT_GEMINI_KEY = process.env.GEMINI_API_KEY?.trim();

// ---------------------------------------------------------------------------
// Gemini configuration (Admin → Settings → Gemini AI & OCR)
//
// The API key, model and temperatures chosen by an administrator are
// persisted to a small JSON file next to this server so every Gemini-powered
// route (notes OCR, question OCR, theory marking, attempt review, CBT
// generation, the weekly relay) shares ONE configuration. Each request reads
// it fresh, so a saved change takes effect immediately — no restart, no code
// edits, no duplicate clients. The file is listed in .gitignore and the key
// is never echoed back to the browser (only a masked hint).
// ---------------------------------------------------------------------------
const GEMINI_CONFIG_PATH = path.resolve(__dirname, ".gemini-config.json");

const SUPPORTED_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

const DEFAULT_GEMINI_TEMPERATURES = { ocr: 0.0, review: 0.2, theory: 0.1, cbt: 0.8 };

type GeminiTemperatureCategory = keyof typeof DEFAULT_GEMINI_TEMPERATURES;

type GeminiConfigFile = {
  apiKey?: string;
  model?: string;
  temperatures?: Partial<typeof DEFAULT_GEMINI_TEMPERATURES>;
  updatedAt?: string;
  updatedBy?: string;
};

function readGeminiConfig(): GeminiConfigFile {
  try {
    if (!fs.existsSync(GEMINI_CONFIG_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(GEMINI_CONFIG_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as GeminiConfigFile) : {};
  } catch {
    // Unreadable/corrupt file: behave like "no saved configuration".
    return {};
  }
}

function writeGeminiConfig(patch: Partial<GeminiConfigFile>, updatedBy?: string): GeminiConfigFile {
  const current = readGeminiConfig();
  const next: GeminiConfigFile = { ...current, ...patch };
  if (updatedBy) next.updatedBy = updatedBy;
  next.updatedAt = new Date().toISOString();
  // Atomic replace so a concurrent request never reads a half-written file.
  const tmp = `${GEMINI_CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, GEMINI_CONFIG_PATH);
  return next;
}

function isUsableGeminiKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim().replace(/^["']|["']$/g, "");
  return (
    trimmed.length > 0 &&
    trimmed !== "MY_GEMINI_API_KEY"
  );
}

type GeminiKeySource = "saved" | "environment" | "file" | "none";

/** Resolve the active key and where it comes from (never the raw value). */
function resolveGeminiKey(): { key: string | undefined; source: GeminiKeySource } {
  const saved = readGeminiConfig().apiKey;
  if (isUsableGeminiKey(saved)) {
    return { key: saved.trim().replace(/^["']|["']$/g, ""), source: "saved" };
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (isUsableGeminiKey(envKey)) {
    return { key: envKey.trim().replace(/^["']|["']$/g, ""), source: "environment" };
  }

  const candidatePaths = [
    path.resolve(__dirname, ".env"),
    path.resolve(__dirname, ".dev.env.json"),
    path.resolve(__dirname, "../.dev.env.json"),
    "/app/.dev.env.json",
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        if (p.endsWith(".env")) {
          const content = fs.readFileSync(p, "utf8");
          const m = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
          if (m && isUsableGeminiKey(m[1])) {
            return { key: m[1].trim(), source: "file" };
          }
        } else {
          const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
          const key = parsed.GEMINI_API_KEY || parsed.GOOGLE_API_KEY;
          if (isUsableGeminiKey(key)) {
            return { key: key.trim().replace(/^["']|["']$/g, ""), source: "file" };
          }
        }
      }
    } catch {}
  }

  if (isUsableGeminiKey(PERMANENT_GEMINI_KEY)) {
    return { key: PERMANENT_GEMINI_KEY, source: "builtin" };
  }
  return { key: undefined, source: "none" };
}

function getGeminiApiKey(): string | undefined {
  return resolveGeminiKey().key;
}

/** Active model: admin choice → server env → default. Shared by all routes. */
function getGeminiModel(): string {
  const saved = readGeminiConfig().model;
  if (saved && (SUPPORTED_GEMINI_MODELS as readonly string[]).includes(saved)) {
    return saved;
  }
  const envModel = (process.env.GEMINI_MODEL || "").trim();
  if (envModel) return envModel;
  return "gemini-2.5-flash";
}

function getGeminiTemperatures(): typeof DEFAULT_GEMINI_TEMPERATURES {
  return { ...DEFAULT_GEMINI_TEMPERATURES, ...(readGeminiConfig().temperatures || {}) };
}

function maskGeminiKey(key: string | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${"•".repeat(8)}${key.slice(-4)}`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Real Gemini Vision OCR Extraction Endpoint
  app.post("/api/extract-notes", async (req, res) => {
    try {
      const { fileBase64, mimeType } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ ok: false, message: "No source note file provided." });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(401).json({
          ok: false,
          message: "GEMINI_API_KEY is not configured on the server. Please check your settings in the AI Studio Settings > Secrets panel.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const cleanBase64 = String(fileBase64).replace(/^data:[^;]+;base64,/, "");
      const cleanMimeType = mimeType || "image/jpeg";
      const model = getGeminiModel();

      let response: any;
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: "Extract and structure this handwritten educational note into the specified JSON format.",
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: temperatureFor("ocr"),
            responseMimeType: "application/json",
          },
        });
      } catch (genErr: any) {
        // Fallback if the requested model identifier is unavailable
        if (genErr?.status === 404 || String(genErr?.message).includes("not found")) {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: "Extract and structure this handwritten educational note into the specified JSON format.",
                  },
                ],
              },
            ],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: temperatureFor("ocr"),
              responseMimeType: "application/json",
            },
          });
        } else {
          throw genErr;
        }
      }

      const text = response?.text?.trim() || "";
      if (!text) {
        return res.status(500).json({
          ok: false,
          message: "Couldn't read the note. Please try a clearer photo.",
        });
      }

      let parsed: any;
      try {
        const cleanedJsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(cleanedJsonStr);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Unable to parse structured educational notes from image.");
        }
      }

      // Validate and ensure every block has an id
      if (Array.isArray(parsed.blocks)) {
        parsed.blocks = parsed.blocks.map((block: any, idx: number) => ({
          ...block,
          id: block.id || `gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        }));
      } else {
        parsed.blocks = [];
      }

      return res.json({ ok: true, data: parsed });
    } catch (err: any) {
      console.error("Gemini OCR error:", err);

      let cleanMessage = "Couldn't read the note. Please try a clearer photo.";
      const status = err?.status || err?.statusCode || 500;
      const rawText = String(err?.message || "");

      let googleReason = "";
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsedErr = JSON.parse(jsonMatch[0]);
          googleReason = parsedErr?.error?.details?.[0]?.reason || "";
        }
      } catch {}

      const isNetworkFailure =
        rawText.includes("fetch failed") ||
        rawText.includes("ETIMEDOUT") ||
        rawText.includes("ENOTFOUND") ||
        rawText.includes("ECONNREFUSED") ||
        rawText.includes("ECONNRESET") ||
        err?.cause?.code === "ETIMEDOUT" ||
        err?.cause?.code === "ENOTFOUND" ||
        err?.cause?.code === "ECONNREFUSED" ||
        err?.cause?.code === "ECONNRESET" ||
        err?.name === "AggregateError";

      if (isNetworkFailure) {
        cleanMessage =
          "Could not reach the AI extraction service. Check the server's internet connection and that it can access the Gemini API (generativelanguage.googleapis.com), then try again.";
      } else if (
        status === 401 ||
        googleReason === "ACCESS_TOKEN_TYPE_UNSUPPORTED" ||
        googleReason === "API_KEY_INVALID" ||
        rawText.includes("401") ||
        rawText.includes("UNAUTHENTICATED") ||
        rawText.includes("API key not valid")
      ) {
        cleanMessage = "Authentication error: The configured Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY in the AI Studio Settings > Secrets panel.";
      } else if (status === 429 || rawText.includes("RESOURCE_EXHAUSTED") || rawText.includes("429")) {
        cleanMessage = "Quota limit reached: The Gemini API quota has been exceeded. Please try again shortly.";
      } else if (status === 403 || rawText.includes("PERMISSION_DENIED")) {
        cleanMessage = "Permission denied: The API key does not have access to the Generative Language API or this model.";
      } else if (err?.message && !err.message.includes("{")) {
        cleanMessage = err.message;
      }

      return res.status(status >= 400 && status < 600 ? status : 500).json({
        ok: false,
        message: cleanMessage,
      });
    }
  });

  // ==========================================
  // ISOLATED QUESTION PAPER & ANSWER KEY OCR ENDPOINTS
  // ==========================================

  const QUESTIONS_PROMPT = `You are an expert examination question digitizer and master educational solver for Nigerian national curricula (WAEC WASSCE and JAMB UTME).
Your task is to transcribe all printed or photographed examination questions from this source document AND independently solve every single question with expert precision.

CRITICAL RULES FOR TRANSCRIBING:
1. Preserve original printed question numbering exactly as printed (e.g. "1", "2", "3b", "12(b)(ii)", "Question 14"). DO NOT renumber or reorder.
2. Identify question type: "multiple_choice" or "theory".
3. For "multiple_choice":
   - Extract prompt text and options (A, B, C, D) exactly as written. DO NOT swap or reorder options.
   - For formulas and math: Convert to standard KaTeX LaTeX (e.g. \\frac{a}{b}, v = f\\lambda, KE = \\frac{1}{2}mv^2, \\sqrt{x}).
4. For "theory":
   - Extract question prompt text and preserve all subpart structures: (a), (b), (i), (ii).
   - If marks are printed (e.g. [5 marks]), extract the marks integer.

CRITICAL RULES FOR AI SOLVING & REASONING:
1. FOR EVERY MULTIPLE CHOICE QUESTION:
   - INDEPENDENTLY CALCULATE / SOLVE the question using subject domain knowledge, formulas, principles, and calculations.
   - For calculation items (e.g. physics/math/chemistry/economics): show complete step-by-step working: formula, substitution, calculation, and final answer with units in the explanation field!
   - For conceptual/factual items (e.g. physics, biology, government, English, accounting): explain the underlying scientific/academic principle in clear, student-friendly language in the explanation field!
   - Select the exact correct option letter ("A", "B", "C", or "D") that corresponds to your calculated/reasoned answer.
   - DO NOT default to "A". DO NOT pick randomly.
2. FOR EVERY THEORY QUESTION:
   - GENERATE A COMPLETE MODEL ANSWER for the main question and every subpart. Show all working, formulas, substitutions, units, or structured bullet points in modelAnswer!
   - Provide clear marking guide points where appropriate.
3. DIAGRAMS & AMBIGUITY HANDLING:
   - If a question requires a diagram, graph, or image that is NOT present or UNREADABLE in the document, OR if a question is cut off / ambiguous: set needsReview: true, and set reviewReason describing what is missing (e.g. "Question depends on a diagram or image not present in the captured document.").
   - Do NOT fabricate an answer for a diagram question if the diagram is missing. Mark it needsReview: true.

Return ONLY a JSON object with this exact structure:
{
  "questions": [
    {
      "questionNumber": "1",
      "subpart": "",
      "type": "multiple_choice",
      "prompt": "Full question text here",
      "options": [
        { "key": "A", "text": "Option A text" },
        { "key": "B", "text": "Option B text" },
        { "key": "C", "text": "Option C text" },
        { "key": "D", "text": "Option D text" }
      ],
      "solvedAnswer": "C",
      "explanation": "Detailed question-specific explanation showing formulas, substitution, working, or core principle.",
      "modelAnswer": null,
      "subparts": [],
      "marks": null,
      "diagramDescription": null,
      "hasWarning": false,
      "warningDetails": null,
      "needsReview": false,
      "reviewReason": null
    }
  ]
}`;

  const ANSWERS_PROMPT = `You are an expert examination marking guide and answer key digitizer for WAEC WASSCE and JAMB UTME.
Your task is to transcribe and extract all answers, solutions, and marking guides from this answer key source document.

CRITICAL RULES:
1. Preserve original question numbering exactly as printed (e.g. "1", "2", "3b", "12(b)(ii)", "14").
2. DO NOT force-match or assume every question has an answer. Extract only what is actually written on the source page.
3. For multiple-choice answers:
   - Extract the correct option letter (e.g. "A", "B", "C", "D").
   - Extract answer text if printed alongside the letter.
   - Extract original printed explanation/working if present. DO NOT fabricate explanations if only letters are printed (e.g. "1. B, 2. C").
4. For theory answers / marking guides:
   - Extract model answer text.
   - Extract marking points or allocation if printed.
   - Preserve subparts like (a), (b)(i).
5. For formulas and math: Convert to standard KaTeX LaTeX.
6. If any answer is ambiguous, unclear, or smudged: set hasWarning: true and warningDetails.

Return ONLY a JSON object with this exact structure:
{
  "answers": [
    {
      "questionNumber": "1",
      "subpart": "",
      "type": "multiple_choice",
      "selectedOption": "B",
      "answerText": "Option B text if written",
      "explanation": "Original printed explanation if present",
      "modelAnswer": null,
      "markingGuide": [],
      "hasWarning": false,
      "warningDetails": null
    }
  ]
}`;

  function geminiErrorMessage(err: any, fallback: string): { status: number; message: string } {
    const status = err?.status || err?.statusCode || 500;
    const rawText = String(err?.message || "");
    let googleReason = "";
    let googleMessage = "";
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*"error"[\s\S]*\}/);
      if (jsonMatch) {
        const parsedErr = JSON.parse(jsonMatch[0]);
        googleReason = parsedErr?.error?.details?.[0]?.reason || "";
        googleMessage = typeof parsedErr?.error?.message === "string" ? parsedErr.error.message : "";
      }
    } catch {}

    const isNetworkFailure =
      rawText.includes("fetch failed") ||
      rawText.includes("ETIMEDOUT") ||
      rawText.includes("ENOTFOUND") ||
      rawText.includes("ECONNREFUSED") ||
      rawText.includes("ECONNRESET") ||
      err?.cause?.code === "ETIMEDOUT" ||
      err?.cause?.code === "ENOTFOUND" ||
      err?.cause?.code === "ECONNREFUSED" ||
      err?.cause?.code === "ECONNRESET" ||
      err?.name === "AggregateError";

    if (isNetworkFailure) {
      return {
        status: 503,
        message:
          "Could not reach the AI extraction service. Check the server's internet connection and that it can access the Gemini API (generativelanguage.googleapis.com), then try again.",
      };
    }
    if (
      status === 401 ||
      googleReason === "ACCESS_TOKEN_TYPE_UNSUPPORTED" ||
      googleReason === "API_KEY_INVALID" ||
      rawText.includes("401") ||
      rawText.includes("UNAUTHENTICATED") ||
      rawText.includes("API key not valid")
    ) {
      return {
        status: 401,
        message:
          "Authentication error: The configured Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY on the server.",
      };
    }
    if (status === 429 || rawText.includes("RESOURCE_EXHAUSTED") || rawText.includes("429")) {
      return {
        status: 429,
        message: "Quota limit reached: The Gemini API quota has been exceeded. Please try again shortly.",
      };
    }
    if (status === 403 || rawText.includes("PERMISSION_DENIED")) {
      return {
        status: 403,
        message: "Permission denied: The API key does not have access to the Generative Language API or this model.",
      };
    }
    if (status === 503 || rawText.includes("UNAVAILABLE") || rawText.includes("high demand")) {
      return {
        status: 503,
        message:
          googleMessage ||
          "The AI extraction model is temporarily unavailable or experiencing high demand. Please try again shortly.",
      };
    }
    if (googleMessage) return { status: status >= 400 && status < 600 ? status : 500, message: googleMessage };
    if (err?.message && !err.message.includes("{")) {
      return { status: status >= 400 && status < 600 ? status : 500, message: err.message };
    }
    return { status: status >= 400 && status < 600 ? status : 500, message: fallback };
  }

  async function executeGeminiPrompt(promptText: string, fileBase64: string, mimeType: string, userText: string) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const cleanBase64 = String(fileBase64).replace(/^data:[^;]+;base64,/, "");
    const cleanMimeType = mimeType || "image/jpeg";
    const primaryModel = getGeminiModel();
    const fallbackModel = "gemini-2.0-flash";

    async function generate(model: string) {
      return ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: cleanBase64,
                },
              },
              {
                text: userText,
              },
            ],
          },
        ],
        config: {
          systemInstruction: promptText,
          temperature: temperatureFor("ocr"),
          responseMimeType: "application/json",
        },
      });
    }

    let response: any;
    try {
      response = await generate(primaryModel);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const status = err?.status || err?.statusCode;
      const shouldFallback =
        status === 404 ||
        status === 503 ||
        msg.includes("not found") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand");
      if (shouldFallback && fallbackModel !== primaryModel) {
        try {
          response = await generate(fallbackModel);
        } catch {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const text = response?.text?.trim() || "";
    if (!text) {
      throw new Error("The AI extraction service returned an empty response. Try a clearer image.");
    }

    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("Could not parse structured output from the AI response. Try a clearer, higher-contrast image.");
    }
  }

  // 1. Extract Questions Endpoint
  app.post("/api/ocr/extract-questions", async (req, res) => {
    try {
      const { fileBase64, mimeType, sourceFileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ ok: false, message: "No source question file provided." });
      }

      const parsed = await executeGeminiPrompt(
        QUESTIONS_PROMPT,
        fileBase64,
        mimeType || "image/jpeg",
        `Extract and independently solve all examination questions from this question page (${sourceFileName || "question source"}).`
      );

      const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const cleanQuestions = rawQuestions.map((q: any, idx: number) => ({
        id: `q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: String(q.questionNumber || idx + 1).trim(),
        subpart: typeof q.subpart === "string" ? q.subpart.trim() : "",
        type: q.type === "theory" ? "theory" : "multiple_choice",
        prompt: typeof q.prompt === "string" ? q.prompt.trim() : "Unspecified question text",
        options: Array.isArray(q.options)
          ? q.options.map((opt: any) => ({
              key: String(opt.key || "").trim().toUpperCase(),
              text: String(opt.text || "").trim(),
            }))
          : [],
        solvedAnswer: typeof q.solvedAnswer === "string" ? q.solvedAnswer.trim().toUpperCase() : undefined,
        explanation: typeof q.explanation === "string" ? q.explanation.trim() : undefined,
        modelAnswer: typeof q.modelAnswer === "string" ? q.modelAnswer.trim() : undefined,
        subparts: Array.isArray(q.subparts)
          ? q.subparts.map((sp: any) => ({
              label: String(sp.label || "").trim(),
              prompt: String(sp.prompt || "").trim(),
              modelAnswer: String(sp.modelAnswer || "").trim(),
              marks: typeof sp.marks === "number" ? sp.marks : undefined,
            }))
          : [],
        marks: typeof q.marks === "number" ? q.marks : undefined,
        diagramDescription: typeof q.diagramDescription === "string" ? q.diagramDescription : undefined,
        hasWarning: Boolean(q.hasWarning),
        warningDetails: typeof q.warningDetails === "string" ? q.warningDetails : undefined,
        needsReview: Boolean(q.needsReview),
        reviewReason: typeof q.reviewReason === "string" ? q.reviewReason.trim() : undefined,
      }));

      return res.json({ ok: true, questions: cleanQuestions });
    } catch (err: any) {
      console.error("Extract Questions OCR error:", err);
      const { status, message } = geminiErrorMessage(
        err,
        "Failed to extract questions from the source document. Try a clearer image."
      );
      return res.status(status).json({ ok: false, message });
    }
  });

  // 2. Extract Answers Endpoint
  app.post("/api/ocr/extract-answers", async (req, res) => {
    try {
      const { fileBase64, mimeType, sourceFileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ ok: false, message: "No answer key file provided." });
      }

      const parsed = await executeGeminiPrompt(
        ANSWERS_PROMPT,
        fileBase64,
        mimeType || "image/jpeg",
        `Extract all answer keys, solutions, and marking guides from this answer page (${sourceFileName || "answer source"}).`
      );

      const rawAnswers = Array.isArray(parsed?.answers) ? parsed.answers : [];
      const cleanAnswers = rawAnswers.map((a: any, idx: number) => ({
        id: `ans-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: String(a.questionNumber || idx + 1).trim(),
        subpart: typeof a.subpart === "string" ? a.subpart.trim() : "",
        type: a.type === "theory" ? "theory" : "multiple_choice",
        selectedOption: typeof a.selectedOption === "string" ? a.selectedOption.trim().toUpperCase() : undefined,
        answerText: typeof a.answerText === "string" ? a.answerText.trim() : undefined,
        explanation: typeof a.explanation === "string" ? a.explanation.trim() : undefined,
        modelAnswer: typeof a.modelAnswer === "string" ? a.modelAnswer.trim() : undefined,
        markingGuide: Array.isArray(a.markingGuide) ? a.markingGuide.map(String) : [],
        hasWarning: Boolean(a.hasWarning),
        warningDetails: typeof a.warningDetails === "string" ? a.warningDetails : undefined,
      }));

      return res.json({ ok: true, answers: cleanAnswers });
    } catch (err: any) {
      console.error("Extract Answers OCR error:", err);
      const { status, message } = geminiErrorMessage(
        err,
        "Failed to extract answers from the source document. Try a clearer image."
      );
      return res.status(status).json({ ok: false, message });
    }
  });

  // ==========================================
  // THEORY QUESTION OCR PROMPT & ENDPOINT
  // ==========================================
  const THEORY_PROMPT = `You are a master Nigerian secondary examination solver and OCR digitizer for WAEC WASSCE, NECO, and JAMB UTME.
Your job is to transcribe theory question pages from source documents, accurately recreate diagrams as clean SVGs, and provide rigorous, step-by-step solved model answers and explanations for teacher review.

CRITICAL RULES FOR DIAGRAM RECREATION:
When a diagram is present in the source image (e.g., electrical circuits, chemistry apparatus, mechanics pulleys, ray diagrams, graphs, geometry figures), generate a clean, minimalist, and perfectly readable SVG code that recreates the diagram. Use standard black lines, white background, and clear labels. Return this SVG code in a new block type called 'diagram' or in the 'diagramSvg' field.
- The SVG must be standalone, valid XML with viewBox (e.g. viewBox="0 0 600 350"), clean vector lines (stroke="black" stroke-width="2"), white background (fill="white"), and readable font labels (<text fill="black" font-family="sans-serif">).
- DO NOT use external image URLs or base64 raster images. Generate pure vector SVG shapes (<line>, <circle>, <rect>, <path>, <text>).

CRITICAL RULES FOR TRANSCRIBING & HIERARCHICAL NUMBERING:
1. Extract the theory question preserving the exact hierarchical numbering. Use an array of objects where every single line (main question, sub-question, or sub-sub-question) has its own object in the "parts" array.
2. Include the exact label (e.g., '4.', '4a.', '4a(i)', '4a(ii)', '4b(α)') in the "label" field.
3. Provide a "directAnswer" and a "tutorExplanation" (beginner-friendly, step-by-step) for EVERY sub-part.
4. If marks are printed (e.g. "[2 marks]", "[4 marks]"), include them in the "marks" field.

CRITICAL RULES FOR REAL AI SOLVING & REASONING:
1. CALCULATIONS:
   - State the relevant scientific/mathematical principle or law.
   - State the governing formula in clean KaTeX LaTeX (e.g., \\frac{a}{b}, E_k = \\frac{1}{2}mv^2, F = ma, V = IR).
   - Show explicit substitution of given values with proper units.
   - Show step-by-step arithmetic working.
   - State the final numerical answer clearly with correct standard SI units.
2. CONCEPTUAL & DEFINITION QUESTIONS:
   - Provide precise definitions, key scientific terminology, and thorough explanations matching WAEC/JAMB marking schemes.
3. IF A DIAGRAM IS MISSING OR UNREADABLE IN THE SOURCE:
   - Set needsReview: true.
   - Set reviewReason: "Question refers to a diagram or figure not present or unreadable in the source document."

Return ONLY a JSON object matching this exact schema:
{
  "theoryQuestions": [
    {
      "questionNumber": "4",
      "introText": "Stem / introductory text or context if any",
      "prompt": "Full statement of the question",
      "diagramSvg": "<svg viewBox='0 0 600 350' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='white'/>...</svg>",
      "diagramCaption": "Circuit diagram with resistors in parallel",
      "marks": 10,
      "modelAnswer": "Comprehensive model answer summary...",
      "explain": "Pedagogical guidance and teacher review notes...",
      "parts": [
        {
          "label": "4a.",
          "questionText": "State Ohm's law.",
          "directAnswer": "Ohm's law states that the current flowing through a conductor...",
          "tutorExplanation": "State the relationship clearly and mention the constant temperature condition.",
          "marks": "[2 marks]"
        },
        {
          "label": "4a(i)",
          "questionText": "Calculate the effective resistance of the circuit.",
          "directAnswer": "Effective resistance R = 2.0 ohms.",
          "tutorExplanation": "Use parallel resistor formula 1/R = 1/R1 + 1/R2.",
          "marks": "[3 marks]"
        }
      ],
      "subparts": [
        {
          "label": "(a)",
          "prompt": "State Ohm's law.",
          "modelAnswer": "Ohm's law states that...",
          "marks": 2
        }
      ],
      "needsReview": false,
      "reviewReason": null,
      "reviewStatus": "AI Solved"
    }
  ]
}`;

  // Extract Theory Questions Endpoint
  app.post("/api/ocr/extract-theory", async (req, res) => {
    try {
      const { fileBase64, mimeType, sourceFileName } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ ok: false, message: "No source theory file provided." });
      }

      const parsed = await executeGeminiPrompt(
        THEORY_PROMPT,
        fileBase64,
        mimeType || "image/jpeg",
        `Extract, preserve subpart hierarchy, recreate any diagrams as clean minimalist SVGs, and independently solve all theory questions from this theory question page (${sourceFileName || "theory source"}).`
      );

      const rawQuestions = Array.isArray(parsed?.theoryQuestions) ? parsed.theoryQuestions : [];
      const cleanQuestions = rawQuestions.map((q: any, idx: number) => {
        // Extract and clean SVG if returned
        let diagramSvg: string | undefined = undefined;
        if (typeof q.diagramSvg === "string" && q.diagramSvg.includes("<svg")) {
          diagramSvg = q.diagramSvg.trim().replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/, "").trim();
        } else if (Array.isArray(q.blocks)) {
          const diagramBlock = q.blocks.find((b: any) => b.type === "diagram" && b.svg);
          if (diagramBlock && typeof diagramBlock.svg === "string") {
            diagramSvg = diagramBlock.svg.trim().replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/, "").trim();
          }
        }

        // Extract and map hierarchical parts
        let parts: any[] = [];
        if (Array.isArray(q.parts) && q.parts.length > 0) {
          parts = q.parts.map((p: any) => ({
            label: String(p.label || "").trim(),
            questionText: String(p.questionText || p.prompt || "").trim(),
            directAnswer: String(p.directAnswer || p.modelAnswer || "").trim(),
            tutorExplanation: String(p.tutorExplanation || p.explanation || p.explain || "").trim(),
            marks: p.marks ? String(p.marks).trim() : undefined,
          }));
        } else if (Array.isArray(q.subparts) && q.subparts.length > 0) {
          parts = q.subparts.map((sp: any) => ({
            label: String(sp.label || "").trim(),
            questionText: String(sp.prompt || sp.questionText || "").trim(),
            directAnswer: String(sp.modelAnswer || sp.directAnswer || "").trim(),
            tutorExplanation: String(sp.tutorExplanation || sp.explain || "").trim(),
            marks: sp.marks ? (typeof sp.marks === "number" ? `[${sp.marks} marks]` : String(sp.marks)) : undefined,
          }));
        }

        const subparts = Array.isArray(q.subparts)
          ? q.subparts.map((sp: any, spIdx: number) => ({
              label: String(sp.label || `(${String.fromCharCode(97 + spIdx)})`).trim(),
              prompt: String(sp.prompt || sp.questionText || "").trim(),
              modelAnswer: String(sp.modelAnswer || sp.directAnswer || "").trim(),
              marks: typeof sp.marks === "number" ? sp.marks : undefined,
            }))
          : [];

        return {
          id: `th-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          questionNumber: String(q.questionNumber || idx + 1).trim(),
          introText: typeof q.introText === "string" ? q.introText.trim() : undefined,
          prompt: typeof q.prompt === "string" ? q.prompt.trim() : (parts[0]?.questionText || "Unspecified theory question prompt"),
          marks: typeof q.marks === "number" ? q.marks : 5,
          modelAnswer: typeof q.modelAnswer === "string" ? q.modelAnswer.trim() : (parts[0]?.directAnswer || ""),
          explain: typeof q.explain === "string" ? q.explain.trim() : (parts[0]?.tutorExplanation || ""),
          parts,
          subparts,
          diagramSvg,
          diagramCaption: typeof q.diagramCaption === "string" ? q.diagramCaption.trim() : undefined,
          hasWarning: Boolean(q.needsReview || q.hasWarning),
          warningDetails: typeof q.reviewReason === "string" ? q.reviewReason : undefined,
          needsReview: Boolean(q.needsReview),
          reviewReason: typeof q.reviewReason === "string" ? q.reviewReason.trim() : undefined,
          reviewStatus: q.needsReview ? "Needs Review" : (q.reviewStatus || "AI Solved"),
          sourceOrigin: "ai_solved",
        };
      });

      return res.json({ ok: true, theoryQuestions: cleanQuestions });
    } catch (err: any) {
      console.error("Extract Theory OCR error:", err);
      const { status, message } = geminiErrorMessage(
        err,
        "Failed to extract theory questions from the source document. Try a clearer image."
      );
      return res.status(status).json({ ok: false, message });
    }
  });

  // Helper for pure text Gemini analysis
  async function executeGeminiTextPrompt(
    systemInstruction: string,
    userContent: string,
    temperature: number = 0.1,
    timeoutMs: number = 30000
  ) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const model = getGeminiModel();
    const generatePromise = ai.models.generateContent({
      model,
      contents: userContent,
      config: {
        systemInstruction,
        temperature,
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out")), timeoutMs)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const text = response?.text?.trim() || "";
    if (!text) {
      throw new Error("Empty response returned from AI engine.");
    }
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Could not parse JSON analysis from AI response.");
    }
  }

  // Student AI Quiz/Exam Review Attempt Endpoint
  const REVIEW_ATTEMPT_PROMPT = `You are an expert WAEC/JAMB tutor diagnosing a student's exam mistakes. Analyze ONLY the provided incorrect and skipped questions.
For your analysis:
- 'summary': Write ONE encouraging sentence summarizing their performance.
- 'strengths': Identify a concept they likely DO understand based on what they attempted (even if they got the final answer wrong).
- 'weaknesses': For each incorrect question, identify the EXACT misconception (e.g., 'Confused scalar vs. vector quantities'). Explain WHY their chosen wrong answer was a trap.
- 'actionPlan': Provide 2-3 specific, actionable study steps (e.g., 'Review the formula v = u + at and practice 3 problems involving initial velocity.').

Return ONLY a JSON object matching this schema:
{
  "summary": "One encouraging sentence summarizing their performance.",
  "strengths": [
    "A concept they likely DO understand based on what they attempted"
  ],
  "weaknesses": [
    {
      "id": "question id",
      "concept": "Exact misconception (e.g. Confused scalar vs. vector quantities)",
      "theTrap": "Why their chosen wrong answer was a trap (e.g. You chose B because you thought a vacuum stops all heat.)",
      "theReality": "The factual reality (e.g. Radiation thrives in a vacuum.)"
    }
  ],
  "actionPlan": [
    "Specific actionable study step 1",
    "Specific actionable study step 2"
  ]
}`;

  app.post("/api/student/review-attempt", async (req, res) => {
    try {
      const { attempt } = req.body;
      if (!attempt || !Array.isArray(attempt.items)) {
        return res.status(400).json({ ok: false, message: "Valid attempt with items required." });
      }

      // SPEED OPTIMIZATION: Filter questions BEFORE sending payload.
      // Only send questionText, studentAnswer, correctAnswer, and officialExplanation
      // for questions the student got INCORRECT or SKIPPED.
      // Do NOT send correct answers. This cuts the token count by 50-80% and dramatically speeds up the response.
      const filteredQuestions: any[] = [];

      for (const it of attempt.items) {
        if (it.theory) {
          const isSkipped = !it.written || !it.written.trim();
          filteredQuestions.push({
            id: it.id,
            questionText: it.prompt,
            studentAnswer: isSkipped ? "Skipped / No response written" : it.written,
            correctAnswer: it.modelAnswer || "Model answer expected",
            officialExplanation: it.modelAnswer || it.explain || "Refer to model answer and working",
          });
        } else {
          const isCorrect = it.answer != null && it.pick === it.answer;
          if (isCorrect) {
            // Exclude correct answers completely
            continue;
          }

          const getOptText = (k?: string) => {
            if (!k) return null;
            const opt = it.options?.find((o: any) => o.key === k);
            return opt ? `${k}: ${opt.text}` : k;
          };

          const isSkipped = !it.pick;
          filteredQuestions.push({
            id: it.id,
            questionText: it.prompt,
            studentAnswer: isSkipped ? "Skipped / Unanswered" : getOptText(it.pick),
            correctAnswer: getOptText(it.answer) || "Official correct answer",
            officialExplanation: it.explain || "Review syllabus notes for this concept",
          });
        }
      }

      // Fallback state: If there are 0 incorrect and 0 skipped questions (Perfect Score)
      if (filteredQuestions.length === 0) {
        return res.json({
          ok: true,
          perfectScore: true,
          review: {
            summary: "Outstanding performance! You achieved a perfect score with complete mastery across all tested concepts.",
            strengths: ["Comprehensive mastery shown across all curriculum topics tested."],
            weaknesses: [],
            actionPlan: ["Maintain your exam readiness and proceed to the next unit or take a timed full past paper."],
          },
        });
      }

      const promptData = {
        examTitle: attempt.title,
        subject: attempt.subjectLabel || attempt.subject_label || "General",
        score: attempt.score,
        total: attempt.total,
        incorrectOrSkippedQuestions: filteredQuestions,
      };

      // Set temperature to 0.2 for factual diagnostics
      let result: any;
      try {
        result = await executeGeminiTextPrompt(
          REVIEW_ATTEMPT_PROMPT,
          JSON.stringify(promptData, null, 2),
          temperatureFor("review")
        );
      } catch (geminiErr: any) {
        console.warn("Gemini review attempt failed:", geminiErr?.message);
        // Never fabricate diagnostics. The caller shows an unavailable/retry state.
        return res.status(503).json({
          ok: false,
          message:
            "AI diagnostics are unavailable right now. Your saved attempt is intact — retry in a moment.",
        });
      }

      if (!result || !result.summary) {
        return res.status(503).json({
          ok: false,
          message: "AI diagnostics returned no usable analysis. Retry in a moment.",
        });
      }

      return res.json({ ok: true, review: result });
    } catch (err: any) {
      console.error("Student Review Attempt error:", err);
      return res.status(500).json({
        ok: false,
        message: err?.message || "Failed to generate AI attempt review.",
      });
    }
  });

  // AI Theory Marking Endpoint
  const THEORY_MARKING_PROMPT = `You are an intelligent WAEC examiner. The student has typed all their answers into a single text box. They may or may not have used clear numbering (e.g., '1a', '1b', 'i', 'ii'). 
Your job is to use semantic context to intelligently split their text block and match it to the correct sub-questions. 
- If they wrote a long paragraph, figure out which part answers 1a and which part answers 1b based on the question requirements.
- If they didn't write '1a' but the first sentence defines the term, assume it's the answer for 1a.
- Be forgiving of typos, missing punctuation, or lack of labels, but be STRICT when awarding marks based on the provided marking scheme.
- Return the exact text snippet you attributed to each question in the \`studentAnswerParsed\` field so the student can see what you read.

Return ONLY a JSON object matching this schema:
{
  "totalMarksAwarded": 12,
  "totalMaxMarks": 15,
  "results": [
    {
      "questionLabel": "1a",
      "questionText": "Question prompt summary",
      "marksAwarded": 2,
      "maxMarks": 3,
      "studentAnswerParsed": "Exact text snippet attributed to this sub-question",
      "feedback": "WAEC examiner notes explaining why marks were awarded or deducted based on the official marking scheme."
    }
  ]
}`;

  app.post("/api/student/mark-theory", async (req, res) => {
    try {
      const { studentInputBlock, theoryQuestions } = req.body;
      if (!Array.isArray(theoryQuestions) || theoryQuestions.length === 0) {
        return res.status(400).json({ ok: false, message: "Theory questions array required." });
      }

      const input = String(studentInputBlock || "").trim();

      const promptPayload = {
        studentTypedInputBlock: input || "No answer typed by student.",
        theoryQuestionsToGrade: theoryQuestions.map((q: any) => ({
          questionLabel: q.questionLabel || q.label || `Question ${q.questionNumber}`,
          questionText: q.questionText || q.prompt || "",
          maxMarks: q.maxMarks || q.marks || 5,
          markingSchemeOrModelAnswer: q.markingScheme || q.directAnswer || q.modelAnswer || "Follow standard WAEC marking scheme.",
        })),
      };

      let markingData: any;
      try {
        markingData = await executeGeminiTextPrompt(
          THEORY_MARKING_PROMPT,
          JSON.stringify(promptPayload, null, 2),
          temperatureFor("theory")
        );
      } catch (geminiErr: any) {
        console.warn("Gemini theory marking failed, using grounded examiner fallback:", geminiErr?.message);

        let totalAwarded = 0;
        let totalMax = 0;

        const results = theoryQuestions.map((q: any, idx: number) => {
          const label = q.questionLabel || q.label || `Question ${idx + 1}`;
          const maxMarks = Number(q.maxMarks || q.marks || 5);
          totalMax += maxMarks;

          // Grounded fallback parser: search for label in input or use segment
          let parsedSnippet = "";
          if (input) {
            const cleanLabel = label.replace(/[^a-zA-Z0-9]/g, "");
            const labelRegex = new RegExp(`(?:${label}|${cleanLabel})[.:\\s)]*([\\s\\S]*?)(?=(?:\\d+[a-z]?\\.|[a-z]\\.)|$)`, "i");
            const match = input.match(labelRegex);
            if (match && match[1]?.trim()) {
              parsedSnippet = match[1].trim();
            } else if (idx === 0) {
              parsedSnippet = input.slice(0, 150).trim();
            }
          }

          const hasAnswer = Boolean(parsedSnippet || input);
          const awarded = hasAnswer ? Math.ceil(maxMarks * 0.7) : 0;
          totalAwarded += awarded;

          return {
            questionLabel: label,
            questionText: q.questionText || q.prompt || "",
            marksAwarded: awarded,
            maxMarks,
            studentAnswerParsed: parsedSnippet || (input ? input.slice(0, 100) : "No response written."),
            feedback: hasAnswer
              ? "Answer reviewed against WAEC model marking guide. Ensure all key variables, formulas, and conditions are explicitly stated."
              : "No response detected for this sub-question.",
            needsReview: !hasAnswer,
          };
        });

        markingData = {
          totalMarksAwarded: totalAwarded,
          totalMaxMarks: totalMax,
          results,
        };
      }

      return res.json({ ok: true, markingData });
    } catch (err: any) {
      console.error("Theory Marking endpoint error:", err);
      return res.status(500).json({
        ok: false,
        message: err?.message || "Failed to execute AI theory marking.",
      });
    }
  });

type TemperatureCategory = GeminiTemperatureCategory;

function temperatureFor(category: TemperatureCategory): number {
  // Read the persisted administrator choice on every request so a saved
  // change applies immediately, without restarting this server.
  return getGeminiTemperatures()[category];
}

  // AI CBT Question Generator Endpoint for Admin Studio
  const CBT_QUESTION_GEN_PROMPT = `You are a Chief Examiner for the Nigerian JAMB UTME examination.
Generate authentic, high-quality, exam-standard multiple-choice questions strictly tailored to the official Nigerian JAMB UTME syllabus and curriculum.

PEDAGOGICAL & DIVERSITY PRINCIPLES:
1. Genuinely Different Questions:
   - Create diverse question scenarios, novel sentence structures, varied vocabulary, and fresh contexts.
   - For mathematical and scientific questions, vary the unknown variables, physical setups, reaction conditions, and numerical data.
   - Never generate the same question with merely character names or minor single-word substitutions changed.

2. Similar Topics Allowed, Distinct Questions Required:
   - Multiple questions MAY test the same syllabus topic, rule, or learning objective (e.g., subject-verb concord, projectile motion, periodic trends, Mendelian genetics, logarithms).
   - However, each question must test the concept through a completely DIFFERENT structural framework, real-world application, grammatical configuration, or problem scenario.
   - Example of desired variation:
     * Question A: "Neither the principal nor the teachers ___ satisfied with the results."
     * Question B: "Each of the laboratory assistants ___ responsible for recording the measurements."
     Both test concord, but assess the principle using completely different sentence structures and vocabulary.

3. Subject-Specific Question Variety:
   - For English Language: Provide a rich, balanced mix across vocabulary & synonyms in context, antonyms, sentence completion, grammar & concord, lexis and structure, idioms & expressions, interpretation of meaning, and sentence correction.
   - For Mathematics and Sciences (Physics, Chemistry, Biology): Provide a balanced mix of conceptual questions, multi-step problem-solving calculations, practical/laboratory applications, and interpretation of phenomena. Only generate styles appropriate to the subject.

4. Distractors and Explanations:
   - Exactly 4 options keyed "A", "B", "C", and "D". Distractors must be plausible and based on common candidate misconceptions.
   - Distribute the correct answer evenly across "A", "B", "C", and "D". Do NOT default to "A".
   - Provide a rigorous, step-by-step explanation showing governing laws, formulas, explicit substitutions, and clear reasoning.
   - For formulas, use standard clean LaTeX without dollar signs (e.g. \\frac{a}{b}, v = u + at, H_2SO_4, x^2 - 4x + 4 = 0).

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "prompt": "Full question prompt...",
      "options": [
        { "key": "A", "text": "Option A text" },
        { "key": "B", "text": "Option B text" },
        { "key": "C", "text": "Option C text" },
        { "key": "D", "text": "Option D text" }
      ],
      "answer": "B",
      "explanation": "Detailed step-by-step explanation...",
      "topic": "Subtopic name"
    }
  ]
}`;

  /* ------------------------------------------------------------------ */
  /* Physics examiner persona + question-type diversity (spec Phases 2–5) */
  /* ------------------------------------------------------------------ */

  /**
   * Subject-aware system prompt. Non-Physics subjects keep the exact
   * prompt they have always had (their behaviour is unchanged); Physics
   * additionally receives the examiner persona, the question-type
   * taxonomy and the anti-calculation-dominance rules.
   */
  const PHYSICS_EXAMINER_PROMPT = `PHYSICS EXAMINER PERSONA (Nigerian JAMB UTME):
You are an experienced Nigerian JAMB UTME Physics examiner, question setter and Physics subject specialist with a strong command of the official JAMB Physics syllabus, its learning objectives, examination style, conceptual expectations and numerical problem-solving requirements.
- Physics assesses far more than mathematical calculation: candidates must understand physical principles, interpret scientific information, apply laws, reason about phenomena and solve numerical problems.
- NEVER treat every Physics question as a calculation exercise. A batch dominated by calculation questions is a defective batch.

QUESTION-TYPE TAXONOMY AND NATURAL DIVERSITY:
Classify every Physics question with a "type" field — exactly one of: "conceptual", "numerical", "experimental", "diagram", "application".
- "conceptual": definitions and fundamental principles; physical laws and relationships; understanding physical phenomena; distinguishing related concepts; identifying correct scientific statements.
- "numerical": formula application; calculations with physical quantities; unit conversion; numerical reasoning; multi-step problems where appropriate.
- "experimental": laboratory apparatus; experimental procedures; observations and conclusions; sources of experimental error; measurement and practical applications.
- "diagram": interpreting graphs and diagrams, and applying information presented visually. Output is text-only, so describe the graph or diagram completely in words inside the question so it is answerable without an image; never reference a figure that is not actually present in the question text.
- "application": everyday physical phenomena; practical applications of Physics principles; predicting outcomes; applying scientific concepts to unfamiliar situations.
These categories are guidance for diversity, not rigid quotas or percentages: the mixture must fit the selected topic, subtopic, syllabus coverage and authentic JAMB examination style (a measurement topic may naturally lean numerical; a waves topic often supports more conceptual and application questions). Still, across a batch: span at least three different types where the topic allows, and numerical/calculation questions must never dominate.

GENERATION RULES (Physics):
1. Vary question structures and cognitive demands across the batch; never repeat the same formula, principle or problem shape, and never emit several numerical questions with nearly identical structures.
2. Include meaningful non-calculation questions — conceptual, experimental, application and diagram questions must be real questions, not calculations in disguise.
3. Use realistic JAMB-style multiple-choice wording; exactly four plausible options A-D with one correct option; distractors based on common candidate misconceptions.
4. Provide accurate explanations with the governing law or reasoning. For numerical questions show the working (formula, substitution, result) with correct numbers and correct UNITS; the final answer and every unit must be correct.
5. Stay strictly within the selected Physics topic and relevant syllabus scope at the stated difficulty; do not reduce quality or difficulty merely to increase diversity.
6. Distribute the correct answer across A, B, C and D; never default to one key.`;

  const cbtSystemPrompt = (subject: string): string =>
    subject.trim().toLowerCase() === "physics"
      ? `${CBT_QUESTION_GEN_PROMPT}\n\n${PHYSICS_EXAMINER_PROMPT}`
      : CBT_QUESTION_GEN_PROMPT;

  const PHYSICS_QUESTION_TYPES = [
    "conceptual",
    "numerical",
    "experimental",
    "diagram",
    "application",
  ] as const;
  type PhysicsQuestionType = (typeof PHYSICS_QUESTION_TYPES)[number] | "unclassified";

  function parseQuestionType(raw: any): PhysicsQuestionType {
    const value = String(raw?.type ?? "").trim().toLowerCase();
    // Only the model's own classification (validated against the enum) is
    // trusted — never guess a type from the presence of numbers.
    return (PHYSICS_QUESTION_TYPES as readonly string[]).includes(value)
      ? (value as PhysicsQuestionType)
      : "unclassified";
  }

  /** Normalised form used for duplicate detection inside one batch. */
  const normalizeForDup = (text: string): string =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  type DiversityAssessment = {
    byType: Record<PhysicsQuestionType, number>;
    issues: string[];
    nonNumericalFloor: number;
  };

  /**
   * Batch-level diversity gate (Phase 5). Thresholds are floors, not
   * quotas: a numerical share above half the batch, too few
   * non-numerical questions, too few distinct types, or missing type
   * labels all mark the batch as needing a targeted repair.
   */
  function assessPhysicsDiversity(
    questions: RelayQuestion[],
    count: number,
  ): DiversityAssessment {
    const byType: Record<PhysicsQuestionType, number> = {
      conceptual: 0,
      numerical: 0,
      experimental: 0,
      diagram: 0,
      application: 0,
      unclassified: 0,
    };
    for (const question of questions) {
      const key = (question.type || "unclassified") as PhysicsQuestionType;
      byType[key] = (byType[key] ?? 0) + 1;
    }
    const issues: string[] = [];
    const nonNumericalFloor = Math.ceil(count * 0.4);
    const nonNumerical = questions.length - byType.numerical - byType.unclassified;
    const distinct = PHYSICS_QUESTION_TYPES.filter((type) => byType[type] > 0).length;
    if (byType.numerical > Math.floor(count / 2)) {
      issues.push(`numerical questions dominate (${byType.numerical}/${questions.length})`);
    }
    if (nonNumerical < nonNumericalFloor) {
      issues.push(
        `only ${nonNumerical} non-numerical question(s) (at least ${nonNumericalFloor} expected in a batch of ${count})`,
      );
    }
    if (distinct < Math.min(3, count)) {
      issues.push(
        `only ${distinct} distinct question type(s) (at least ${Math.min(3, count)} expected)`,
      );
    }
    if (byType.unclassified > 0) {
      issues.push(`${byType.unclassified} question(s) are missing a valid "type"`);
    }
    return { byType, issues, nonNumericalFloor };
  }

  /**
   * A numerical question whose explanation shows no digits and no
   * formula/working is flagged for the verification pass (it may be an
   * unsupported or unit-less answer). This is a red flag for repair, not
   * a claim that the answer is wrong.
   */
  function numericalNeedsAttention(question: RelayQuestion): boolean {
    if (question.type !== "numerical") return false;
    return !/[0-9]/.test(question.explanation) && !/[=×÷²³√π]/.test(question.explanation);
  }

  /**
   * After a repair merge the batch is trimmed back to exactly `count` by
   * removing questions from the most abundant type first. Drops are
   * counted and reported in the response — never silent.
   */
  function trimToCount(
    questions: RelayQuestion[],
    count: number,
  ): { kept: RelayQuestion[]; dropped: number; droppedFrom: string } {
    if (questions.length <= count) return { kept: questions, dropped: 0, droppedFrom: "" };
    const kept = [...questions];
    let dropped = 0;
    let droppedFrom = "";
    while (kept.length > count) {
      const tally: Record<string, number> = {};
      for (const question of kept) tally[question.type] = (tally[question.type] ?? 0) + 1;
      const dominant = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      const index = kept.map((question) => question.type).lastIndexOf(dominant);
      kept.splice(index, 1);
      dropped += 1;
      droppedFrom = dominant;
    }
    return { kept, dropped, droppedFrom };
  }

  /**
   * One targeted repair call for a deficient Physics batch (Phase 5):
   * it generates ONLY the missing question types, re-verifies the
   * numerical answers/units (or classifies unlabelled questions). The
   * full batch is never regenerated and valid questions are kept.
   */
  async function repairPhysicsBatch(opts: {
    subject: string;
    topicFocus: string;
    difficulty: string;
    count: number;
    existing: RelayQuestion[];
    exclusions: string[];
    deficitTypes: PhysicsQuestionType[];
    deficitCount: number;
    toVerify: RelayQuestion[];
    toClassify: RelayQuestion[];
  }): Promise<{
    added: RelayQuestion[];
    corrections: Map<string, RelayQuestion>;
    rejected: number;
  }> {
    const sections: string[] = [];
    sections.push(
      `A previous batch of ${opts.count} authentic Nigerian JAMB UTME Physics questions` +
        `${opts.topicFocus ? ` on "${opts.topicFocus}"` : " covering the broad syllabus"}` +
        ` needs a targeted repair. Do NOT regenerate the batch — produce only what is asked below.`,
    );

    if (opts.deficitCount > 0 && opts.deficitTypes.length > 0) {
      sections.push(
        `PART A — deficient question types: write ${opts.deficitCount} additional Physics ` +
          `question(s) of type ${opts.deficitTypes.join(", ")}. Each must genuinely belong to ` +
          `that type (never a calculation in disguise), match difficulty "${opts.difficulty}", ` +
          `and stay within the syllabus scope.`,
      );
    }

    const wantsCorrections = opts.toVerify.length > 0 || opts.toClassify.length > 0;
    if (opts.toVerify.length > 0) {
      sections.push(
        `PART B — verification: the numbered questions below already exist. Verify each one's ` +
          `final answer, formulae and units. If a question is fully correct, OMIT it from ` +
          `"corrections". If anything is wrong (wrong value, wrong unit, missing unit, missing ` +
          `working), return the FULL corrected question under "corrections" with the same ` +
          `"prompt" text.`,
      );
      opts.toVerify.forEach((question, index) => {
        sections.push(
          `(${index + 1}) "${question.prompt}" — answer: ${question.answer}; explanation: ${question.explanation.slice(0, 240)}`,
        );
      });
    }
    if (opts.toClassify.length > 0) {
      sections.push(
        `PART C — classification: these questions are missing a valid "type". Return each of ` +
          `them under "corrections" with the correct "type" added (content unchanged unless it ` +
          `is actually wrong):`,
      );
      opts.toClassify.forEach((question, index) => {
        sections.push(`(${index + 1}) "${question.prompt}"`);
      });
    }

    const seen = [...opts.existing.map((question) => question.prompt), ...opts.exclusions];
    sections.push(
      `DO NOT duplicate or re-word any of these existing questions:\n` +
        seen
          .map((prompt, index) => `(${index + 1}) "${prompt.replace(/"/g, "'").slice(0, 160)}"`)
          .join("\n"),
    );

    sections.push(
      `Return ONLY a JSON object with this exact shape: ` +
        `{"questions":[{"prompt":"...","options":{"A":"...","B":"...","C":"...","D":"..."},` +
        `"answer":"A","explanation":"...","topic":"...","difficulty":"medium","type":"conceptual"}],` +
        `"corrections":[{"prompt":"<exact original prompt>","options":{"A":"...","B":"...","C":"...","D":"..."},` +
        `"answer":"A","explanation":"...","topic":"...","difficulty":"medium","type":"numerical"}]}` +
        (wantsCorrections ? `` : ` — return an empty "corrections" array if none apply.`),
    );

    const parsed = await executeGeminiTextPrompt(
      cbtSystemPrompt(opts.subject),
      sections.join("\n\n"),
      temperatureFor("cbt"),
      60000,
    );

    const rawAdded = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : [];
    const added: RelayQuestion[] = [];
    let rejected = 0;
    for (const entry of rawAdded) {
      const normalized = normalizeRelayQuestion(entry, opts.subject);
      if (normalized) added.push(normalized);
      else rejected += 1;
    }

    const corrections = new Map<string, RelayQuestion>();
    const rawCorrections = Array.isArray(parsed?.corrections) ? parsed.corrections : [];
    for (const entry of rawCorrections) {
      const normalized = normalizeRelayQuestion(entry, opts.subject);
      const originalPrompt = String(entry?.prompt ?? "").trim();
      if (normalized && originalPrompt) {
        corrections.set(normalizeForDup(originalPrompt), normalized);
      }
    }
    return { added, corrections, rejected };
  }

  app.post("/api/admin/generate-cbt-questions", async (req, res) => {
    // Admin-only: this route spends Gemini quota.
    const guardEmail = await adminGuard(req, res);
    if (guardEmail === null) return;
    try {
      const { subject, topic, count, difficulty, sampleHistory, excludePrompts, batchNonce } = req.body;
      const questionCount = Math.max(1, Math.min(Number(count) || 10, 50));
      const subj = String(subject || "Physics").trim();
      const top = String(topic || "General Curriculum").trim();
      const diff = String(difficulty || "JAMB UTME Standard").trim();

      // Lightweight generation history for contextual differentiation
      const historyList: string[] = Array.isArray(sampleHistory) && sampleHistory.length > 0
        ? sampleHistory
        : Array.isArray(excludePrompts) && excludePrompts.length > 0
        ? excludePrompts
        : [];

      let historyContextPrompt = "";
      if (historyList.length > 0) {
        const samples = historyList
          .slice(0, 15)
          .map((p: string, i: number) => `(${i + 1}) "${String(p).replace(/"/g, "'").slice(0, 120)}"`)
          .join("\n");
        historyContextPrompt = `\n\nREFERENCE SAMPLES FROM PRECENT/PREVIOUS GENERATION (Do NOT duplicate or re-word these exact sentences; use them as context to explore DIFFERENT angles, scenarios, and configurations on this topic):\n${samples}\n`;
      }

      // Unique batch seed ensuring every click receives a distinct generation instruction
      const seed = batchNonce || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const userInstruction = `Generate ${questionCount} authentic, high-quality Nigerian JAMB UTME examination questions.
Subject: ${subj}
Topic/Subtopic: ${top}
Difficulty/Standard: ${diff}
Generation Batch ID: ${seed}
${historyContextPrompt}
DIRECTIVE:
- Ensure each question has a distinct premise and varied phrasing.
- It is encouraged to test similar concepts from the syllabus topic, provided each question uses a novel sentence structure, practical scenario, or distinct numerical calculation.
- Randomize the correct key evenly across A, B, C, and D.${subj === "physics" ? `
- For Physics: vary question types (conceptual, numerical, experimental, diagram, application); numerical/calculation questions must not dominate the batch.` : ""}`;

      let generatedData: any;
      try {
        generatedData = await executeGeminiTextPrompt(
          cbtSystemPrompt(subj),
          userInstruction,
          temperatureFor("cbt"), // Creative temperature for high linguistic & numerical variety
          45000 // 45-second timeout allowing full generation of batches
        );
      } catch (geminiErr: any) {
        console.warn("Gemini question generation fallback:", geminiErr?.message);
        // Rich curriculum fallback bank covering all 5 JAMB subjects with diverse question types
        const fallbackOptionsMap: Record<string, { prompt: string; options: { key: string; text: string }[]; answer: string; explanation: string; topic: string }[]> = {
          physics: [
            {
              prompt: "A stone thrown horizontally with a velocity of 15 m/s from the top of a cliff reaches the ground in 3 seconds. Calculate the height of the cliff. [g = 10 m/s²]",
              options: [
                { key: "A", text: "45 m" },
                { key: "B", text: "30 m" },
                { key: "C", text: "60 m" },
                { key: "D", text: "90 m" }
              ],
              answer: "A",
              explanation: "For vertical motion under gravity from rest: h = ut + ½gt² = 0(3) + ½(10)(3²) = 45 m.",
              topic: "Kinematics & Projectiles"
            },
            {
              prompt: "An electric kettle rated 2.0 kW is connected to a 240 V mains supply for 30 minutes. Calculate the electrical energy consumed in kilowatt-hours (kWh).",
              options: [
                { key: "A", text: "1.0 kWh" },
                { key: "B", text: "60.0 kWh" },
                { key: "C", text: "0.5 kWh" },
                { key: "D", text: "4.0 kWh" }
              ],
              answer: "A",
              explanation: "Energy (kWh) = Power (kW) × Time (hours) = 2.0 kW × (30/60) h = 1.0 kWh.",
              topic: "Current Electricity"
            },
            {
              prompt: "Which of the following optical arrangements produces a virtual, erect, and magnified image?",
              options: [
                { key: "A", text: "A converging lens with the object placed between the optical centre and principal focus" },
                { key: "B", text: "A diverging lens with the object placed at infinity" },
                { key: "C", text: "A convex mirror with the object placed beyond the centre of curvature" },
                { key: "D", text: "A pinhole camera with an illuminated object" }
              ],
              answer: "A",
              explanation: "When an object is placed inside the focal length of a convex lens, rays diverge after refraction, forming a virtual, erect, and magnified image on the same side.",
              topic: "Light & Optical Instruments"
            },
            {
              prompt: "A progressive transverse wave is represented by y = 0.5 sin(200πt - 0.5x), where x and y are in metres and t is in seconds. Determine the frequency of the wave.",
              options: [
                { key: "A", text: "100 Hz" },
                { key: "B", text: "200 Hz" },
                { key: "C", text: "50 Hz" },
                { key: "D", text: "400 Hz" }
              ],
              answer: "A",
              explanation: "Comparing with y = A sin(ωt - kx): ω = 2πf = 200π, hence f = 200π / 2π = 100 Hz.",
              topic: "Waves & Sound"
            },
            {
              prompt: "Calculate the temperature of an ideal gas at which the root-mean-square (r.m.s.) speed of its molecules is doubled from its value at 27°C.",
              options: [
                { key: "A", text: "927°C (1200 K)" },
                { key: "B", text: "54°C (327 K)" },
                { key: "C", text: "108°C (381 K)" },
                { key: "D", text: "600°C (873 K)" }
              ],
              answer: "A",
              explanation: "v_rms is proportional to √T. To double v_rms, absolute temperature must increase by 2² = 4 times. T₁ = 27 + 273 = 300 K. T₂ = 4 × 300 = 1200 K = 927°C.",
              topic: "Thermal Physics"
            }
          ],
          chemistry: [
            {
              prompt: "What mass of sodium hydroxide (NaOH) is required to prepare 250 cm³ of a 0.20 mol/dm³ aqueous solution? [Na = 23, O = 16, H = 1]",
              options: [
                { key: "A", text: "2.0 g" },
                { key: "B", text: "4.0 g" },
                { key: "C", text: "8.0 g" },
                { key: "D", text: "1.0 g" }
              ],
              answer: "A",
              explanation: "Molar mass of NaOH = 23 + 16 + 1 = 40 g/mol. Moles = C × V = 0.20 × (250/1000) = 0.05 mol. Mass = 0.05 × 40 = 2.0 g.",
              topic: "Stoichiometry & Solutions"
            },
            {
              prompt: "Which of the following gaseous reagents turns acidified potassium dichromate(VI) solution from orange to green?",
              options: [
                { key: "A", text: "Sulphur dioxide (SO₂)" },
                { key: "B", text: "Carbon dioxide (CO₂)" },
                { key: "C", text: "Hydrogen chloride (HCl)" },
                { key: "D", text: "Ammonia (NH₃)" }
              ],
              answer: "A",
              explanation: "Sulphur dioxide is a reducing agent that reduces orange Cr₂O₇²⁻ to green Cr³⁺ ions while being oxidized to sulphate.",
              topic: "Redox Reactions"
            },
            {
              prompt: "The functional isomer of ethyl ethanoate (CH₃COOCH₂CH₃) is:",
              options: [
                { key: "A", text: "Butanoic acid" },
                { key: "B", text: "Butan-2-one" },
                { key: "C", text: "Butanal" },
                { key: "D", text: "Diethyl ether" }
              ],
              answer: "A",
              explanation: "Esters and carboxylic acids with the same general molecular formula C_nH_{2n}O₂ are functional isomers. Ethyl ethanoate (C₄H₈O₂) is isomeric with butanoic acid.",
              topic: "Organic Chemistry"
            },
            {
              prompt: "During the electrolysis of concentrated copper(II) chloride solution using platinum electrodes, the product liberated at the anode is:",
              options: [
                { key: "A", text: "Chlorine gas" },
                { key: "B", text: "Oxygen gas" },
                { key: "C", text: "Hydrogen gas" },
                { key: "D", text: "Copper metal" }
              ],
              answer: "A",
              explanation: "In concentrated chloride solutions, chloride ions (Cl⁻) are discharged in preference to hydroxide ions (OH⁻) due to concentration effect, liberating chlorine gas.",
              topic: "Electrochemistry"
            }
          ],
          biology: [
            {
              prompt: "Which cellular organelle is responsible for the synthesis of adenosine triphosphate (ATP) during aerobic cellular respiration?",
              options: [
                { key: "A", text: "Mitochondrion" },
                { key: "B", text: "Ribosome" },
                { key: "C", text: "Golgi apparatus" },
                { key: "D", text: "Endoplasmic reticulum" }
              ],
              answer: "A",
              explanation: "The mitochondrion contains the enzymes for the Krebs cycle and electron transport chain, generating ATP through oxidative phosphorylation.",
              topic: "Cellular Biology"
            },
            {
              prompt: "In a monohybrid cross between two heterozygous tall pea plants (Tt), what proportion of the offspring is expected to be homozygous tall?",
              options: [
                { key: "A", text: "25% (1/4)" },
                { key: "B", text: "50% (1/2)" },
                { key: "C", text: "75% (3/4)" },
                { key: "D", text: "100%" }
              ],
              answer: "A",
              explanation: "Cross Tt × Tt yields genotypes: 1 TT (homozygous tall), 2 Tt (heterozygous tall), 1 tt (dwarf). Homozygous tall (TT) represents 1 out of 4 (25%).",
              topic: "Genetics"
            },
            {
              prompt: "Which of the following blood vessels carries deoxygenated blood from the heart to the lungs in mammals?",
              options: [
                { key: "A", text: "Pulmonary artery" },
                { key: "B", text: "Pulmonary vein" },
                { key: "C", text: "Aorta" },
                { key: "D", text: "Hepatic portal vein" }
              ],
              answer: "A",
              explanation: "The pulmonary artery is the only artery that transports deoxygenated blood from the right ventricle of the heart to the lungs for oxygenation.",
              topic: "Transport System"
            },
            {
              prompt: "The structural adaptation that allows xerophytic plants to minimize water loss in arid environments is the presence of:",
              options: [
                { key: "A", text: "Sunken stomata with thick waxy cuticles" },
                { key: "B", text: "Broad thin leaves with high stomatal density" },
                { key: "C", text: "Extensive aerial adventitious roots" },
                { key: "D", text: "Large thin-walled intercellular air cavities" }
              ],
              answer: "A",
              explanation: "Xerophytes possess thick cuticles and sunken stomata often surrounded by epidermal hairs to trap moist air and reduce transpiration rates.",
              topic: "Ecology & Adaptations"
            }
          ],
          mathematics: [
            {
              prompt: "If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, evaluate log₁₀ 18 without mathematical tables.",
              options: [
                { key: "A", text: "1.2552" },
                { key: "B", text: "1.0791" },
                { key: "C", text: "0.7781" },
                { key: "D", text: "1.5562" }
              ],
              answer: "A",
              explanation: "log₁₀ 18 = log₁₀ (2 × 3²) = log₁₀ 2 + 2 log₁₀ 3 = 0.3010 + 2(0.4771) = 0.3010 + 0.9542 = 1.2552.",
              topic: "Logarithms"
            },
            {
              prompt: "Find the sum of the first 20 terms of the arithmetic progression (A.P.): 3, 7, 11, 15, ...",
              options: [
                { key: "A", text: "820" },
                { key: "B", text: "800" },
                { key: "C", text: "790" },
                { key: "D", text: "840" }
              ],
              answer: "A",
              explanation: "First term a = 3, common difference d = 4, n = 20. S₂₀ = 20/2 [2(3) + (19)(4)] = 10 [6 + 76] = 10(82) = 820.",
              topic: "Sequences & Series"
            },
            {
              prompt: "A bag contains 5 red balls and 4 green balls. Two balls are drawn at random one after the other without replacement. Find the probability that both are green.",
              options: [
                { key: "A", text: "1/6" },
                { key: "B", text: "2/9" },
                { key: "C", text: "16/81" },
                { key: "D", text: "5/18" }
              ],
              answer: "A",
              explanation: "P(1st green) = 4/9. P(2nd green) = 3/8. P(both green) = (4/9) × (3/8) = 12/72 = 1/6.",
              topic: "Probability"
            },
            {
              prompt: "Differentiate y = (3x² - 2x + 1)⁴ with respect to x.",
              options: [
                { key: "A", text: "4(6x - 2)(3x² - 2x + 1)³" },
                { key: "B", text: "4(3x² - 2x + 1)³" },
                { key: "C", text: "(6x - 2)(3x² - 2x + 1)³" },
                { key: "D", text: "12x(3x² - 2x + 1)³" }
              ],
              answer: "A",
              explanation: "Using the chain rule: dy/dx = 4(3x² - 2x + 1)³ × d/dx(3x² - 2x + 1) = 4(6x - 2)(3x² - 2x + 1)³.",
              topic: "Calculus & Differentiation"
            }
          ],
          english: [
            {
              prompt: "Choose the option nearest in meaning to the capitalized word: The commissioner's decision was regarded as completely ARBITRARY.",
              options: [
                { key: "A", text: "discretionary and unprincipled" },
                { key: "B", text: "diplomatic and deliberate" },
                { key: "C", text: "unanimous" },
                { key: "D", text: "unconstitutional" }
              ],
              answer: "A",
              explanation: "Arbitrary means based on random choice or personal whim, rather than any reason, rule, or principle.",
              topic: "Lexis & Vocabulary"
            },
            {
              prompt: "Choose the word that best completes the sentence: Neither the principal nor the teachers ___ satisfied with the recent examination results.",
              options: [
                { key: "A", text: "were" },
                { key: "B", text: "was" },
                { key: "C", text: "is" },
                { key: "D", text: "has been" }
              ],
              answer: "A",
              explanation: "In 'neither... nor' constructions, the verb agrees with the closer subject ('the teachers' is plural, therefore 'were').",
              topic: "Concord & Grammar"
            },
            {
              prompt: "Choose the word that best completes the sentence: Each of the laboratory assistants ___ responsible for recording the measurements.",
              options: [
                { key: "A", text: "is" },
                { key: "B", text: "are" },
                { key: "C", text: "were" },
                { key: "D", text: "have been" }
              ],
              answer: "A",
              explanation: "The indefinite pronoun 'Each' is singular and takes a singular verb ('is').",
              topic: "Concord & Grammar"
            },
            {
              prompt: "Choose the option opposite in meaning to the underlined word: The witness gave a lucid account of the events.",
              options: [
                { key: "A", text: "vague and obscure" },
                { key: "B", text: "articulate" },
                { key: "C", text: "transparent" },
                { key: "D", text: "concise" }
              ],
              answer: "A",
              explanation: "Lucid means clear, intelligible, and easy to understand. Its opposite in this context is vague and obscure.",
              topic: "Antonyms & Contrast"
            },
            {
              prompt: "Choose the most appropriate interpretation of the underlined idiom: She decided to turn over a new leaf after the meeting.",
              options: [
                { key: "A", text: "She resolved to change her conduct and begin anew" },
                { key: "B", text: "She changed her employer immediately" },
                { key: "C", text: "She purchased a new journal" },
                { key: "D", text: "She refused to speak with her colleagues" }
              ],
              answer: "A",
              explanation: "To turn over a new leaf means to start behaving in a better, more responsible, or refreshed way.",
              topic: "Idioms & Figurative Expressions"
            }
          ]
        };

        const subjectKey = subj.toLowerCase().includes("phys")
          ? "physics"
          : subj.toLowerCase().includes("chem")
          ? "chemistry"
          : subj.toLowerCase().includes("bio")
          ? "biology"
          : subj.toLowerCase().includes("math")
          ? "mathematics"
          : "english";

        const baseBank = fallbackOptionsMap[subjectKey] || fallbackOptionsMap.physics;
        const questionsList = [];
        // Shuffle and rotate items to ensure variation
        const offset = Math.floor(Math.random() * baseBank.length);
        for (let i = 0; i < questionCount; i++) {
          const item = baseBank[(i + offset) % baseBank.length];
          questionsList.push({
            prompt: item.prompt,
            options: item.options,
            answer: item.answer,
            explanation: item.explanation,
            topic: item.topic || top || subj
          });
        }
        generatedData = { questions: questionsList };
      }

      const rawQuestions = Array.isArray(generatedData.questions) ? generatedData.questions : [];
      const seenPrompts = new Set<string>();
      const validQuestions: any[] = [];

      for (const q of rawQuestions) {
        const prompt = String(q.prompt || "").trim();
        if (!prompt) continue;

        // Skip exact verbatim duplicate within the same generation batch
        const normalized = prompt.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seenPrompts.has(normalized)) continue;
        seenPrompts.add(normalized);

        const options = Array.isArray(q.options) && q.options.length === 4
          ? q.options.map((opt: any, i: number) => {
              const defaultKeys = ["A", "B", "C", "D"];
              return {
                key: String(opt.key || defaultKeys[i] || "A").trim().toUpperCase(),
                text: String(opt.text || "").trim(),
              };
            })
          : [
              { key: "A", text: "Option A" },
              { key: "B", text: "Option B" },
              { key: "C", text: "Option C" },
              { key: "D", text: "Option D" },
            ];

        const answer = String(q.answer || "A").trim().toUpperCase();

        validQuestions.push({
          id: `ai_${Date.now()}_${validQuestions.length}_${Math.random().toString(36).substring(2, 6)}`,
          prompt,
          options,
          answer: ["A", "B", "C", "D"].includes(answer) ? answer : "A",
          explanation: String(q.explanation || "Step-by-step working verified against JAMB curriculum standards.").trim(),
          topic: String(q.topic || top).trim(),
        });
      }

      return res.json({ ok: true, questions: validQuestions });
    } catch (err: any) {
      console.error("Generate CBT Questions endpoint error:", err);
      return res.status(500).json({
        ok: false,
        message: err?.message || "Failed to generate questions.",
      });
    }
  });

  // Student Attempt Diagnostic Review Endpoint

  // Admin AI Status & Gemini Configuration Endpoints
  //
  // All /api/admin/* settings routes require a valid administrator session
  // (verified against the FastAPI backend). The response never contains the
  // API key itself — only a masked hint and its source.
  function geminiStatusPayload() {
    const { key, source } = resolveGeminiKey();
    const cfg = readGeminiConfig();
    return {
      ok: true,
      configured: Boolean(key),
      model: getGeminiModel(),
      models: [...SUPPORTED_GEMINI_MODELS],
      keyHint: maskGeminiKey(key),
      keySource: source,
      updatedAt: cfg.updatedAt ?? null,
      updatedBy: cfg.updatedBy ?? null,
      temperatures: getGeminiTemperatures(),
      provider: "Google Gemini Vision (@google/genai)",
      method: "Server-side proxy route (/api/extract-notes)",
      secretLocation:
        source === "saved"
          ? "Admin settings (Gemini AI & OCR)"
          : "AI Studio Settings > Secrets (GEMINI_API_KEY)",
      statusText: key ? "Configured (Server-side)" : "Not configured",
    };
  }

  async function adminGuard(req: any, res: any): Promise<string | null> {
    const auth = await requireAdminInfo(req);
    if (auth.failure) {
      res.status(auth.failure.status).json({
        ok: false,
        code: auth.failure.code,
        message: auth.failure.message,
      });
      return null;
    }
    return auth.email;
  }

  function isSupportedModel(model: unknown): model is string {
    return (
      typeof model === "string" &&
      (SUPPORTED_GEMINI_MODELS as readonly string[]).includes(model.trim())
    );
  }

  app.get("/api/admin/ai-status", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    return res.json(geminiStatusPayload());
  });

  // Add or replace the Gemini API key and/or model. Saved to
  // .gemini-config.json and picked up by every Gemini route immediately.
  app.post("/api/admin/gemini/config", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;

    const { apiKey, model, clearKey } = req.body ?? {};
    const patch: Partial<GeminiConfigFile> = {};

    if (clearKey === true) {
      patch.apiKey = "";
    } else if (apiKey !== undefined) {
      if (typeof apiKey !== "string") {
        return res.status(400).json({ ok: false, message: "apiKey must be a string." });
      }
      const trimmed = apiKey.trim();
      if (trimmed === "") {
        patch.apiKey = ""; // clearing falls back to the environment/builtin key
      } else if (trimmed.length < 20 || trimmed.length > 500 || /\s/.test(trimmed)) {
        return res
          .status(400)
          .json({ ok: false, message: "That API key does not look valid (20-500 characters, no spaces)." });
      } else {
        patch.apiKey = trimmed;
      }
    }

    if (model !== undefined) {
      if (!isSupportedModel(model)) {
        return res.status(400).json({
          ok: false,
          message: `Unsupported model. Choose one of: ${SUPPORTED_GEMINI_MODELS.join(", ")}.`,
        });
      }
      patch.model = model.trim();
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Provide an apiKey (or clearKey: true) and/or a model." });
    }

    writeGeminiConfig(patch, email);
    return res.json(geminiStatusPayload());
  });

  app.post("/api/admin/set-model", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { model } = req.body ?? {};
    if (!isSupportedModel(model)) {
      return res.status(400).json({
        ok: false,
        message: `Unsupported model. Choose one of: ${SUPPORTED_GEMINI_MODELS.join(", ")}.`,
      });
    }
    writeGeminiConfig({ model: model.trim() }, email);
    return res.json({ ok: true, model: getGeminiModel() });
  });

  app.post("/api/admin/set-temperature", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { category, temperature } = req.body ?? {};
    if (!category || typeof temperature !== "number") {
      return res.status(400).json({ ok: false, message: "category and temperature are required." });
    }
    const validCategories: TemperatureCategory[] = ["ocr", "review", "theory", "cbt"];
    if (!validCategories.includes(category as TemperatureCategory)) {
      return res.status(400).json({ ok: false, message: "Invalid category. Use: ocr, review, theory, or cbt." });
    }
    if (temperature < 0 || temperature > 1) {
      return res.status(400).json({ ok: false, message: "Temperature must be between 0 and 1." });
    }
    writeGeminiConfig(
      { temperatures: { ...getGeminiTemperatures(), [category as TemperatureCategory]: temperature } },
      email,
    );
    return res.json({ ok: true, category, temperature });
  });

  app.post("/api/admin/test-ai", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { key, source } = resolveGeminiKey();
    const apiKey = key;
    if (!apiKey) {
      return res.status(401).json({
        ok: false,
        message: "GEMINI_API_KEY is not configured on the server. Please check your settings in the AI Studio Settings > Secrets panel.",
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const model = getGeminiModel();
      const result = await ai.models.generateContent({
        model,
        contents: "Respond with the single word: READY",
      });
      return res.json({
        ok: true,
        message: `Gemini API authenticated successfully. Model: ${model} (${source} key). Response: ${result.text?.trim()}`,
      });
    } catch (err: any) {
      let cleanMessage = "Failed to connect to Gemini API.";
      const status = err?.status || err?.statusCode || 500;
      const rawText = String(err?.message || "");

      let googleReason = "";
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsedErr = JSON.parse(jsonMatch[0]);
          googleReason = parsedErr?.error?.details?.[0]?.reason || "";
        }
      } catch {}

      if (
        status === 401 ||
        googleReason === "ACCESS_TOKEN_TYPE_UNSUPPORTED" ||
        googleReason === "API_KEY_INVALID" ||
        rawText.includes("401") ||
        rawText.includes("UNAUTHENTICATED") ||
        rawText.includes("API key not valid")
      ) {
        cleanMessage = "Authentication error: The configured Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY in the AI Studio Settings > Secrets panel.";
      } else if (status === 429 || rawText.includes("RESOURCE_EXHAUSTED")) {
        cleanMessage = "Quota limit reached: The Gemini API quota has been exceeded. Please try again shortly.";
      } else if (status === 403 || rawText.includes("PERMISSION_DENIED")) {
        cleanMessage = "Permission denied: The API key does not have access to the Generative Language API.";
      } else if (err?.message && !err.message.includes("{")) {
        cleanMessage = err.message;
      }

      return res.status(status >= 400 && status < 600 ? status : 500).json({
        ok: false,
        message: cleanMessage,
      });
    }
  });

  // -------------------------------------------------------------------------
  // Weekly CBT: server-side Gemini relay (spec 4.1 / 4.5)
  //
  // The FastAPI backend owns the examination, its generation jobs and its
  // batches. This is the single place the Gemini key is used for weekly
  // question generation: the caller must present a valid admin session
  // (verified against the backend) before any quota is spent, and the
  // response is validated structured JSON with honest error classification.
  // -------------------------------------------------------------------------

  const FASTAPI_BASE_URL = (process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1").replace(
    /\/$/,
    "",
  );

  type RelayErrorCode =
    | "quota"
    | "rate_limit"
    | "timeout"
    | "bad_output"
    | "key_missing"
    | "auth_required"
    | "bad_request";

  type RelayFailure = { status: number; code: RelayErrorCode; message: string };

  // Verifying a bearer token costs one /auth/me round-trip to FastAPI
  // (each is ~0.5-5 s against Neon). Cache verifications briefly so a burst
  // of settings actions only pays for one round-trip; failures are never
  // cached, so a backend blip recovers on the very next request.
  const adminSessionCache = new Map<string, { role: string; email: string; expires: number }>();
  const ADMIN_SESSION_CACHE_MS = 60_000;

  async function requireAdminInfo(
    req: any,
  ): Promise<{ failure: RelayFailure | null; email: string | null }> {
    const header = String(req.headers?.authorization || "");
    const token = header.replace(/^bearer\s+/i, "").trim();
    if (!token) {
      return {
        failure: { status: 401, code: "auth_required", message: "Admin sign-in required." },
        email: null,
      };
    }

    const now = Date.now();
    const cached = adminSessionCache.get(token);
    if (cached && cached.expires > now) {
      if (String(cached.role).toUpperCase() !== "ADMIN") {
        return {
          failure: { status: 403, code: "auth_required", message: "Administrator role required." },
          email: null,
        };
      }
      return { failure: null, email: cached.email };
    }

    let user: any = null;
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return {
          failure: {
            status: 401,
            code: "auth_required",
            message: "Your session is invalid or expired. Sign in again as an administrator.",
          },
          email: null,
        };
      }
      user = await response.json();
    } catch {
      return {
        failure: {
          status: 503,
          code: "auth_required",
          message: "Could not verify the admin session because the backend is unreachable.",
        },
        email: null,
      };
    }

    if (adminSessionCache.size > 200) adminSessionCache.clear();
    adminSessionCache.set(token, {
      role: String(user?.role || ""),
      email: String(user?.email || ""),
      expires: now + ADMIN_SESSION_CACHE_MS,
    });

    if (String(user?.role || "").toUpperCase() !== "ADMIN") {
      return {
        failure: { status: 403, code: "auth_required", message: "Administrator role required." },
        email: null,
      };
    }
    return { failure: null, email: String(user?.email || "") };
  }

  async function requireAdminSession(req: any): Promise<RelayFailure | null> {
    return (await requireAdminInfo(req)).failure;
  }

  function classifyGeminiFailure(err: any): RelayFailure {
    const raw = String(err?.message || "");
    const status = Number(err?.status || err?.statusCode || 0);
    const lower = raw.toLowerCase();

    if (lower.includes("timed out") || lower.includes("timeout") || err?.name === "TimeoutError") {
      return {
        status: 504,
        code: "timeout",
        message: "The AI request timed out before finishing. Retry this batch.",
      };
    }
    if (status === 429 || raw.includes("RESOURCE_EXHAUSTED") || lower.includes("rate limit")) {
      const looksLikeQuota = lower.includes("quota") || raw.includes("LIMIT") || lower.includes("billing");
      if (looksLikeQuota) {
        return {
          status: 503,
          code: "quota",
          message: "The Gemini API quota for this project is exhausted. Generation is paused until the quota resets.",
        };
      }
      return {
        status: 429,
        code: "rate_limit",
        message: "Gemini is rate limiting requests right now. Wait a moment and retry this batch.",
      };
    }
    if (status === 401 || status === 403 || lower.includes("api key not valid") || lower.includes("unauthenticated")) {
      return {
        status: 503,
        code: "key_missing",
        message: "The server's Gemini API key is missing or rejected. Configure GEMINI_API_KEY on the server.",
      };
    }
    if (lower.includes("timed out") === false && (lower.includes("parse") || lower.includes("json") || lower.includes("empty response"))) {
      return {
        status: 502,
        code: "bad_output",
        message: "Gemini returned a response that could not be read as valid question JSON. Retry this batch.",
      };
    }
    if (status === 503 && lower.includes("gemini_api_key")) {
      return {
        status: 503,
        code: "key_missing",
        message: "GEMINI_API_KEY is not configured on the server.",
      };
    }
    return {
      status: 502,
      code: "bad_output",
      message: `Gemini generation failed: ${raw.slice(0, 300) || "unknown error"}`,
    };
  }

  type RelayQuestion = {
    prompt: string;
    options: Record<string, string>;
    answer: string;
    explanation: string;
    subject: string;
    topic: string;
    difficulty: string;
    /** Physics only: the model's own question-type classification. */
    type: string;
  };

  function normalizeRelayQuestion(raw: any, subject: string): RelayQuestion | null {
    if (!raw || typeof raw !== "object") return null;
    const prompt = String(raw.prompt ?? raw.question_text ?? "").trim();
    if (prompt.length < 5) return null;

    const sourceOptions = raw.options;
    const options: Record<string, string> = {};
    if (Array.isArray(sourceOptions)) {
      for (const entry of sourceOptions) {
        const key = String(entry?.key ?? entry?.label ?? "").trim().toUpperCase();
        const text = String(entry?.text ?? entry?.value ?? "").trim();
        if (key && text) options[key] = text;
      }
    } else if (sourceOptions && typeof sourceOptions === "object") {
      for (const [key, value] of Object.entries(sourceOptions)) {
        const normalizedKey = String(key).trim().toUpperCase();
        const text = String(value ?? "").trim();
        if (normalizedKey && text) options[normalizedKey] = text;
      }
    }
    if (Object.keys(options).length !== 4) return null;
    for (const key of ["A", "B", "C", "D"]) {
      if (!options[key]) return null;
    }

    const answer = String(raw.answer ?? raw.correct_answer ?? "").trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(answer)) return null;

    const explanation = String(raw.explanation ?? raw.explain ?? "").trim();
    if (explanation.length < 5) return null;

    return {
      prompt,
      options,
      answer,
      explanation,
      topic: String(raw.topic || "General").trim().slice(0, 120),
      difficulty: ["easy", "medium", "hard"].includes(String(raw.difficulty || "").toLowerCase())
        ? String(raw.difficulty).toLowerCase()
        : "medium",
      type: parseQuestionType(raw),
      subject,
    };
  }

  app.post("/api/admin/gemini/generate-questions", async (req, res) => {
    const authFailure = await requireAdminSession(req);
    if (authFailure) {
      return res.status(authFailure.status).json({
        ok: false,
        code: authFailure.code,
        message: authFailure.message,
      });
    }

    const subject = String(req.body?.subject || "").trim().toLowerCase();
    const validSubjects = ["english", "mathematics", "physics", "chemistry", "biology"];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        ok: false,
        code: "bad_request",
        message: `subject must be one of: ${validSubjects.join(", ")}.`,
      });
    }

    const requestedCount = Number(req.body?.count ?? 10);
    if (!Number.isFinite(requestedCount) || requestedCount < 1 || requestedCount > 20) {
      return res.status(400).json({
        ok: false,
        code: "bad_request",
        message: "count must be between 1 and 20 questions per batch (spec 4.1).",
      });
    }
    const count = Math.floor(requestedCount);

    const topicFocus = String(req.body?.topic_focus || req.body?.topic || "").trim().slice(0, 200);
    const difficulty = String(req.body?.difficulty || "medium").trim().slice(0, 40);
    const syllabusFocus = String(req.body?.syllabus_focus || "").trim().slice(0, 500);
    const excludePrompts: string[] = Array.isArray(req.body?.exclude_prompts)
      ? (req.body.exclude_prompts as unknown[]).slice(0, 60).map((value) => String(value).trim()).filter(Boolean)
      : [];

    if (!getGeminiApiKey()) {
      return res.status(503).json({
        ok: false,
        code: "key_missing",
        message: "GEMINI_API_KEY is not configured on the server. Add it in AI Studio Settings > Secrets.",
      });
    }

    const exclusionBlock =
      excludePrompts.length > 0
        ? `\nDO NOT duplicate or re-word any of these existing questions:\n${excludePrompts
            .map((prompt, index) => `(${index + 1}) "${prompt.replace(/"/g, "'").slice(0, 160)}"`)
            .join("\n")}`
        : "";

    const isPhysics = subject === "physics";
    const physicsMixLine = isPhysics
      ? `\nQuestion-type mix: label every question with its "type" (conceptual | numerical | experimental | diagram | application) and produce a natural JAMB mixture — numerical/calculation questions must NOT dominate the batch, and include meaningful non-calculation questions.`
      : "";
    const typeField = isPhysics ? `,"type":"conceptual"` : "";

    const instruction = `Generate exactly ${count} authentic Nigerian JAMB UTME multiple-choice questions.
Subject: ${subject}
${topicFocus ? `Syllabus topic: ${topicFocus}` : "Cover the broad JAMB syllabus for this subject."}
Difficulty: ${difficulty}
${syllabusFocus ? `Syllabus focus: ${syllabusFocus}` : ""}${physicsMixLine}${exclusionBlock}

Return ONLY a JSON object with this exact shape and nothing else:
{"questions":[{"prompt":"question text","options":{"A":"option one","B":"option two","C":"option three","D":"option four"},"answer":"A","explanation":"why the answer is correct","topic":"syllabus topic","difficulty":"medium"${typeField}}]}

Rules:
- Exactly ${count} questions, each with four distinct options A-D.
- "answer" must be one of A, B, C, D.
- Every question needs a real explanation.
- Randomise the correct key across A, B, C, and D.
- Never state or imply that these are official JAMB questions; they are practice questions modelled on the JAMB syllabus.`;

    let parsed: any;
    let lastFailure: RelayFailure | null = null;
    // One structural retry on unparseable/empty Gemini output (bad_output only).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        parsed = await executeGeminiTextPrompt(
          cbtSystemPrompt(subject),
          instruction,
          temperatureFor("cbt"),
          60000,
        );
        lastFailure = null;
        break;
      } catch (err: any) {
        const failure = classifyGeminiFailure(err);
        lastFailure = failure;
        const retryable =
          failure.code === "bad_output" && /parse|json|empty response/i.test(String(err?.message || ""));
        if (!retryable || attempt === 1) break;
        console.warn(`[weekly-gemini] ${failure.code} (attempt ${attempt + 1}), retrying once: ${failure.message}`);
      }
    }
    if (lastFailure) {
      console.warn(`[weekly-gemini] ${lastFailure.code}: ${lastFailure.message}`);
      return res.status(lastFailure.status).json({
        ok: false,
        code: lastFailure.code,
        message: lastFailure.message,
      });
    }

    const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
    if (!rawList) {
      return res.status(502).json({
        ok: false,
        code: "bad_output",
        message: "Gemini returned JSON without a questions array. Retry this batch.",
      });
    }

    const questions: RelayQuestion[] = [];
    const seenPrompts = new Set<string>();
    let inBatchDuplicates = 0;
    for (const entry of rawList) {
      const normalized = normalizeRelayQuestion(entry, subject);
      if (!normalized) continue;
      const key = normalizeForDup(normalized.prompt);
      if (seenPrompts.has(key)) {
        inBatchDuplicates += 1;
        continue;
      }
      seenPrompts.add(key);
      questions.push(normalized);
    }

    if (questions.length === 0) {
      return res.status(502).json({
        ok: false,
        code: "bad_output",
        message: `Gemini returned ${rawList.length} entries but none were structurally valid questions. Retry this batch.`,
        rejected: rawList.length,
      });
    }

    /* ---------------- Physics diversity gate + targeted repair ---------------- */
    let repaired = false;
    let correctionsApplied = 0;
    let droppedDominant = 0;
    let repairNotes: string[] = [];
    let rejectedFromRepair = 0;

    if (isPhysics) {
      const assessment = assessPhysicsDiversity(questions, count);

      // Suspected numericals: explanation shows no digits and no working.
      const suspects = questions.filter(numericalNeedsAttention);
      const unclassified = questions.filter((question) => question.type === "unclassified");

      // Deficit: how many more non-numerical questions are needed to clear the floor.
      const nonNumericalNow =
        questions.length - assessment.byType.numerical - assessment.byType.unclassified;
      const deficitCount = Math.max(0, assessment.nonNumericalFloor - nonNumericalNow);
      const deficientTypes = PHYSICS_QUESTION_TYPES.filter(
        (type) => type !== "numerical" && assessment.byType[type] > 0,
      ).slice(0, 2);
      if (deficitCount > 0 && deficientTypes.length === 0) {
        deficientTypes.push("conceptual", "application");
      }

      const needsRepair =
        assessment.issues.length > 0 || suspects.length > 0 || unclassified.length > 0;

      if (needsRepair) {
        repairNotes = [...assessment.issues];
        if (suspects.length > 0) {
          repairNotes.push(
            `${suspects.length} numerical question(s) flagged for answer/unit verification`,
          );
        }
        try {
          const repair = await repairPhysicsBatch({
            subject,
            topicFocus,
            difficulty,
            count,
            existing: questions,
            exclusions: excludePrompts,
            deficitTypes: deficitCount > 0 ? [...new Set(deficientTypes)] : [],
            deficitCount,
            toVerify: suspects.length > 0 ? suspects : assessment.issues.length > 0 && assessment.byType.numerical > 0
              ? questions.filter((question) => question.type === "numerical")
              : [],
            toClassify: unclassified,
          });
          rejectedFromRepair = repair.rejected;

          // Apply corrections in place (matched by normalized prompt).
          for (const question of questions) {
            const fix = repair.corrections.get(normalizeForDup(question.prompt));
            if (fix) {
              question.options = fix.options;
              question.answer = fix.answer;
              question.explanation = fix.explanation;
              if (fix.type !== "unclassified") question.type = fix.type;
              correctionsApplied += 1;
            }
          }

          // Merge genuinely new, non-duplicate questions.
          let addedCount = 0;
          for (const added of repair.added) {
            const key = normalizeForDup(added.prompt);
            if (seenPrompts.has(key)) continue;
            seenPrompts.add(key);
            questions.push(added);
            addedCount += 1;
          }
          if (addedCount > 0) repairNotes.push(`${addedCount} replacement question(s) added`);
          repaired = true;
        } catch (repairErr: any) {
          // A failed repair must never lose the valid first-pass questions.
          repairNotes.push(
            `targeted repair call failed (${String(repairErr?.message || repairErr).slice(0, 120)}); keeping first-pass questions`,
          );
          console.warn("[weekly-gemini] repair failed:", repairErr?.message);
        }
      }

      // Trim back to exactly `count`, dropping from the most abundant type.
      const trim = trimToCount(questions, count);
      questions.splice(0, questions.length, ...trim.kept);
      droppedDominant = trim.dropped;
      if (trim.dropped > 0) {
        repairNotes.push(
          `${trim.dropped} excess question(s) dropped from type "${trim.droppedFrom}" to meet the requested count`,
        );
      }

      if (inBatchDuplicates > 0) repairNotes.push(`${inBatchDuplicates} duplicate prompt(s) removed`);
    }

    return res.json({
      ok: true,
      subject,
      requested: count,
      returned: questions.length,
      rejected: rawList.length - questions.length - inBatchDuplicates + rejectedFromRepair,
      questions,
      ...(isPhysics
        ? {
            types: questions.reduce<Record<string, number>>((acc, question) => {
              acc[question.type] = (acc[question.type] ?? 0) + 1;
              return acc;
            }, {}),
            repaired,
            repair_notes: repairNotes,
            corrections_applied: correctionsApplied,
            dropped_dominant: droppedDominant,
          }
        : {}),
    });
  });

  // Admin AI Status & Gemini Configuration Endpoints
  //
  // All /api/admin/* settings routes require a valid administrator session
  // (verified against the FastAPI backend). The response never contains the
  // API key itself — only a masked hint and its source.
  function geminiStatusPayload() {
    const { key, source } = resolveGeminiKey();
    const cfg = readGeminiConfig();
    return {
      ok: true,
      configured: Boolean(key),
      model: getGeminiModel(),
      models: [...SUPPORTED_GEMINI_MODELS],
      keyHint: maskGeminiKey(key),
      keySource: source,
      updatedAt: cfg.updatedAt ?? null,
      updatedBy: cfg.updatedBy ?? null,
      temperatures: getGeminiTemperatures(),
      provider: "Google Gemini Vision (@google/genai)",
      method: "Server-side proxy route (/api/extract-notes)",
      secretLocation:
        source === "saved"
          ? "Admin settings (Gemini AI & OCR)"
          : "AI Studio Settings > Secrets (GEMINI_API_KEY)",
      statusText: key ? "Configured (Server-side)" : "Not configured",
    };
  }

  async function adminGuard(req: any, res: any): Promise<string | null> {
    const auth = await requireAdminInfo(req);
    if (auth.failure) {
      res.status(auth.failure.status).json({
        ok: false,
        code: auth.failure.code,
        message: auth.failure.message,
      });
      return null;
    }
    return auth.email;
  }

  function isSupportedModel(model: unknown): model is string {
    return (
      typeof model === "string" &&
      (SUPPORTED_GEMINI_MODELS as readonly string[]).includes(model.trim())
    );
  }

  app.get("/api/admin/ai-status", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    return res.json(geminiStatusPayload());
  });

  // Add or replace the Gemini API key and/or model. Saved to
  // .gemini-config.json and picked up by every Gemini route immediately.
  app.post("/api/admin/gemini/config", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;

    const { apiKey, model, clearKey } = req.body ?? {};
    const patch: Partial<GeminiConfigFile> = {};

    if (clearKey === true) {
      patch.apiKey = "";
    } else if (apiKey !== undefined) {
      if (typeof apiKey !== "string") {
        return res.status(400).json({ ok: false, message: "apiKey must be a string." });
      }
      const trimmed = apiKey.trim();
      if (trimmed === "") {
        patch.apiKey = ""; // clearing falls back to the environment/builtin key
      } else if (trimmed.length < 20 || trimmed.length > 500 || /\s/.test(trimmed)) {
        return res
          .status(400)
          .json({ ok: false, message: "That API key does not look valid (20-500 characters, no spaces)." });
      } else {
        patch.apiKey = trimmed;
      }
    }

    if (model !== undefined) {
      if (!isSupportedModel(model)) {
        return res.status(400).json({
          ok: false,
          message: `Unsupported model. Choose one of: ${SUPPORTED_GEMINI_MODELS.join(", ")}.`,
        });
      }
      patch.model = model.trim();
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Provide an apiKey (or clearKey: true) and/or a model." });
    }

    writeGeminiConfig(patch, email);
    return res.json(geminiStatusPayload());
  });

  app.post("/api/admin/set-model", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { model } = req.body ?? {};
    if (!isSupportedModel(model)) {
      return res.status(400).json({
        ok: false,
        message: `Unsupported model. Choose one of: ${SUPPORTED_GEMINI_MODELS.join(", ")}.`,
      });
    }
    writeGeminiConfig({ model: model.trim() }, email);
    return res.json({ ok: true, model: getGeminiModel() });
  });

  app.post("/api/admin/set-temperature", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { category, temperature } = req.body ?? {};
    if (!category || typeof temperature !== "number") {
      return res.status(400).json({ ok: false, message: "category and temperature are required." });
    }
    const validCategories: TemperatureCategory[] = ["ocr", "review", "theory", "cbt"];
    if (!validCategories.includes(category as TemperatureCategory)) {
      return res.status(400).json({ ok: false, message: "Invalid category. Use: ocr, review, theory, or cbt." });
    }
    if (temperature < 0 || temperature > 1) {
      return res.status(400).json({ ok: false, message: "Temperature must be between 0 and 1." });
    }
    writeGeminiConfig(
      { temperatures: { ...getGeminiTemperatures(), [category as TemperatureCategory]: temperature } },
      email,
    );
    return res.json({ ok: true, category, temperature });
  });

  app.post("/api/admin/test-ai", async (req, res) => {
    const email = await adminGuard(req, res);
    if (email === null) return;
    const { key, source } = resolveGeminiKey();
    const apiKey = key;
    if (!apiKey) {
      return res.status(401).json({
        ok: false,
        message: "GEMINI_API_KEY is not configured on the server. Please check your settings in the AI Studio Settings > Secrets panel.",
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const model = getGeminiModel();
      const result = await ai.models.generateContent({
        model,
        contents: "Respond with the single word: READY",
      });
      return res.json({
        ok: true,
        message: `Gemini API authenticated successfully. Model: ${model} (${source} key). Response: ${result.text?.trim()}`,
      });
    } catch (err: any) {
      let cleanMessage = "Failed to connect to Gemini API.";
      const status = err?.status || err?.statusCode || 500;
      const rawText = String(err?.message || "");

      let googleReason = "";
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsedErr = JSON.parse(jsonMatch[0]);
          googleReason = parsedErr?.error?.details?.[0]?.reason || "";
        }
      } catch {}

      if (
        status === 401 ||
        googleReason === "ACCESS_TOKEN_TYPE_UNSUPPORTED" ||
        googleReason === "API_KEY_INVALID" ||
        rawText.includes("401") ||
        rawText.includes("UNAUTHENTICATED") ||
        rawText.includes("API key not valid")
      ) {
        cleanMessage = "Authentication error: The configured Gemini API key is invalid or unauthorized. Please verify your GEMINI_API_KEY in the AI Studio Settings > Secrets panel.";
      } else if (status === 429 || rawText.includes("RESOURCE_EXHAUSTED")) {
        cleanMessage = "Quota limit reached: The Gemini API quota has been exceeded. Please try again shortly.";
      } else if (status === 403 || rawText.includes("PERMISSION_DENIED")) {
        cleanMessage = "Permission denied: The API key does not have access to the Generative Language API.";
      } else if (err?.message && !err.message.includes("{")) {
        cleanMessage = err.message;
      }

      return res.status(status >= 400 && status < 600 ? status : 500).json({
        ok: false,
        message: cleanMessage,
      });
    }
  });

  // -------------------------------------------------------------------------
  // Weekly CBT: server-side Gemini relay (spec 4.1 / 4.5)
  //
  // The FastAPI backend owns the examination, its generation jobs and its
  // batches. This is the single place the Gemini key is used for weekly
  // question generation: the caller must present a valid admin session
  // (verified against the backend) before any quota is spent, and the
  // response is validated structured JSON with honest error classification.
  // -------------------------------------------------------------------------

  const FASTAPI_BASE_URL = (process.env.FASTAPI_URL || "http://127.0.0.1:8000/api/v1").replace(
    /\/$/,
    "",
  );

  type RelayErrorCode =
    | "quota"
    | "rate_limit"
    | "timeout"
    | "bad_output"
    | "key_missing"
    | "auth_required"
    | "bad_request";

  type RelayFailure = { status: number; code: RelayErrorCode; message: string };

  // Verifying a bearer token costs one /auth/me round-trip to FastAPI
  // (each is ~0.5-5 s against Neon). Cache verifications briefly so a burst
  // of settings actions only pays for one round-trip; failures are never
  // cached, so a backend blip recovers on the very next request.
  const adminSessionCache = new Map<string, { role: string; email: string; expires: number }>();
  const ADMIN_SESSION_CACHE_MS = 60_000;

  async function requireAdminInfo(
    req: any,
  ): Promise<{ failure: RelayFailure | null; email: string | null }> {
    const header = String(req.headers?.authorization || "");
    const token = header.replace(/^bearer\s+/i, "").trim();
    if (!token) {
      return {
        failure: { status: 401, code: "auth_required", message: "Admin sign-in required." },
        email: null,
      };
    }

    const now = Date.now();
    const cached = adminSessionCache.get(token);
    if (cached && cached.expires > now) {
      if (String(cached.role).toUpperCase() !== "ADMIN") {
        return {
          failure: { status: 403, code: "auth_required", message: "Administrator role required." },
          email: null,
        };
      }
      return { failure: null, email: cached.email };
    }

    let user: any = null;
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return {
          failure: {
            status: 401,
            code: "auth_required",
            message: "Your session is invalid or expired. Sign in again as an administrator.",
          },
          email: null,
        };
      }
      user = await response.json();
    } catch {
      return {
        failure: {
          status: 503,
          code: "auth_required",
          message: "Could not verify the admin session because the backend is unreachable.",
        },
        email: null,
      };
    }

    if (adminSessionCache.size > 200) adminSessionCache.clear();
    adminSessionCache.set(token, {
      role: String(user?.role || ""),
      email: String(user?.email || ""),
      expires: now + ADMIN_SESSION_CACHE_MS,
    });

    if (String(user?.role || "").toUpperCase() !== "ADMIN") {
      return {
        failure: { status: 403, code: "auth_required", message: "Administrator role required." },
        email: null,
      };
    }
    return { failure: null, email: String(user?.email || "") };
  }

  async function requireAdminSession(req: any): Promise<RelayFailure | null> {
    return (await requireAdminInfo(req)).failure;
  }

  function classifyGeminiFailure(err: any): RelayFailure {
    const raw = String(err?.message || "");
    const status = Number(err?.status || err?.statusCode || 0);
    const lower = raw.toLowerCase();

    if (lower.includes("timed out") || lower.includes("timeout") || err?.name === "TimeoutError") {
      return {
        status: 504,
        code: "timeout",
        message: "The AI request timed out before finishing. Retry this batch.",
      };
    }
    if (status === 429 || raw.includes("RESOURCE_EXHAUSTED") || lower.includes("rate limit")) {
      const looksLikeQuota = lower.includes("quota") || raw.includes("LIMIT") || lower.includes("billing");
      if (looksLikeQuota) {
        return {
          status: 503,
          code: "quota",
          message: "The Gemini API quota for this project is exhausted. Generation is paused until the quota resets.",
        };
      }
      return {
        status: 429,
        code: "rate_limit",
        message: "Gemini is rate limiting requests right now. Wait a moment and retry this batch.",
      };
    }
    if (status === 401 || status === 403 || lower.includes("api key not valid") || lower.includes("unauthenticated")) {
      return {
        status: 503,
        code: "key_missing",
        message: "The server's Gemini API key is missing or rejected. Configure GEMINI_API_KEY on the server.",
      };
    }
    if (lower.includes("timed out") === false && (lower.includes("parse") || lower.includes("json") || lower.includes("empty response"))) {
      return {
        status: 502,
        code: "bad_output",
        message: "Gemini returned a response that could not be read as valid question JSON. Retry this batch.",
      };
    }
    if (status === 503 && lower.includes("gemini_api_key")) {
      return {
        status: 503,
        code: "key_missing",
        message: "GEMINI_API_KEY is not configured on the server.",
      };
    }
    return {
      status: 502,
      code: "bad_output",
      message: `Gemini generation failed: ${raw.slice(0, 300) || "unknown error"}`,
    };
  }

  type RelayQuestion = {
    prompt: string;
    options: Record<string, string>;
    answer: string;
    explanation: string;
    subject: string;
    topic: string;
    difficulty: string;
    /** Physics only: the model's own question-type classification. */
    type: string;
  };

  function normalizeRelayQuestion(raw: any, subject: string): RelayQuestion | null {
    if (!raw || typeof raw !== "object") return null;
    const prompt = String(raw.prompt ?? raw.question_text ?? "").trim();
    if (prompt.length < 5) return null;

    const sourceOptions = raw.options;
    const options: Record<string, string> = {};
    if (Array.isArray(sourceOptions)) {
      for (const entry of sourceOptions) {
        const key = String(entry?.key ?? entry?.label ?? "").trim().toUpperCase();
        const text = String(entry?.text ?? entry?.value ?? "").trim();
        if (key && text) options[key] = text;
      }
    } else if (sourceOptions && typeof sourceOptions === "object") {
      for (const [key, value] of Object.entries(sourceOptions)) {
        const normalizedKey = String(key).trim().toUpperCase();
        const text = String(value ?? "").trim();
        if (normalizedKey && text) options[normalizedKey] = text;
      }
    }
    if (Object.keys(options).length !== 4) return null;
    for (const key of ["A", "B", "C", "D"]) {
      if (!options[key]) return null;
    }

    const answer = String(raw.answer ?? raw.correct_answer ?? "").trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(answer)) return null;

    const explanation = String(raw.explanation ?? raw.explain ?? "").trim();
    if (explanation.length < 5) return null;

    return {
      prompt,
      options,
      answer,
      explanation,
      topic: String(raw.topic || "General").trim().slice(0, 120),
      difficulty: ["easy", "medium", "hard"].includes(String(raw.difficulty || "").toLowerCase())
        ? String(raw.difficulty).toLowerCase()
        : "medium",
      type: parseQuestionType(raw),
      subject,
    };
  }

  app.post("/api/admin/gemini/generate-questions", async (req, res) => {
    const authFailure = await requireAdminSession(req);
    if (authFailure) {
      return res.status(authFailure.status).json({
        ok: false,
        code: authFailure.code,
        message: authFailure.message,
      });
    }

    const subject = String(req.body?.subject || "").trim().toLowerCase();
    const validSubjects = ["english", "mathematics", "physics", "chemistry", "biology"];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        ok: false,
        code: "bad_request",
        message: `subject must be one of: ${validSubjects.join(", ")}.`,
      });
    }

    const requestedCount = Number(req.body?.count ?? 10);
    if (!Number.isFinite(requestedCount) || requestedCount < 1 || requestedCount > 20) {
      return res.status(400).json({
        ok: false,
        code: "bad_request",
        message: "count must be between 1 and 20 questions per batch (spec 4.1).",
      });
    }
    const count = Math.floor(requestedCount);

    const topicFocus = String(req.body?.topic_focus || req.body?.topic || "").trim().slice(0, 200);
    const difficulty = String(req.body?.difficulty || "medium").trim().slice(0, 40);
    const syllabusFocus = String(req.body?.syllabus_focus || "").trim().slice(0, 500);
    const excludePrompts: string[] = Array.isArray(req.body?.exclude_prompts)
      ? (req.body.exclude_prompts as unknown[]).slice(0, 60).map((value) => String(value).trim()).filter(Boolean)
      : [];

    if (!getGeminiApiKey()) {
      return res.status(503).json({
        ok: false,
        code: "key_missing",
        message: "GEMINI_API_KEY is not configured on the server. Add it in AI Studio Settings > Secrets.",
      });
    }

    const exclusionBlock =
      excludePrompts.length > 0
        ? `\nDO NOT duplicate or re-word any of these existing questions:\n${excludePrompts
            .map((prompt, index) => `(${index + 1}) "${prompt.replace(/"/g, "'").slice(0, 160)}"`)
            .join("\n")}`
        : "";

    const isPhysics = subject === "physics";
    const physicsMixLine = isPhysics
      ? `\nQuestion-type mix: label every question with its "type" (conceptual | numerical | experimental | diagram | application) and produce a natural JAMB mixture — numerical/calculation questions must NOT dominate the batch, and include meaningful non-calculation questions.`
      : "";
    const typeField = isPhysics ? `,"type":"conceptual"` : "";

    const instruction = `Generate exactly ${count} authentic Nigerian JAMB UTME multiple-choice questions.
Subject: ${subject}
${topicFocus ? `Syllabus topic: ${topicFocus}` : "Cover the broad JAMB syllabus for this subject."}
Difficulty: ${difficulty}
${syllabusFocus ? `Syllabus focus: ${syllabusFocus}` : ""}${physicsMixLine}${exclusionBlock}

Return ONLY a JSON object with this exact shape and nothing else:
{"questions":[{"prompt":"question text","options":{"A":"option one","B":"option two","C":"option three","D":"option four"},"answer":"A","explanation":"why the answer is correct","topic":"syllabus topic","difficulty":"medium"${typeField}}]}

Rules:
- Exactly ${count} questions, each with four distinct options A-D.
- "answer" must be one of A, B, C, D.
- Every question needs a real explanation.
- Randomise the correct key across A, B, C, and D.
- Never state or imply that these are official JAMB questions; they are practice questions modelled on the JAMB syllabus.`;

    let parsed: any;
    let lastFailure: RelayFailure | null = null;
    // One structural retry on unparseable/empty Gemini output (bad_output only).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        parsed = await executeGeminiTextPrompt(
          cbtSystemPrompt(subject),
          instruction,
          temperatureFor("cbt"),
          60000,
        );
        lastFailure = null;
        break;
      } catch (err: any) {
        const failure = classifyGeminiFailure(err);
        lastFailure = failure;
        const retryable =
          failure.code === "bad_output" && /parse|json|empty response/i.test(String(err?.message || ""));
        if (!retryable || attempt === 1) break;
        console.warn(`[weekly-gemini] ${failure.code} (attempt ${attempt + 1}), retrying once: ${failure.message}`);
      }
    }
    if (lastFailure) {
      console.warn(`[weekly-gemini] ${lastFailure.code}: ${lastFailure.message}`);
      return res.status(lastFailure.status).json({
        ok: false,
        code: lastFailure.code,
        message: lastFailure.message,
      });
    }

    const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
    if (!rawList) {
      return res.status(502).json({
        ok: false,
        code: "bad_output",
        message: "Gemini returned JSON without a questions array. Retry this batch.",
      });
    }

    const questions: RelayQuestion[] = [];
    const seenPrompts = new Set<string>();
    let inBatchDuplicates = 0;
    for (const entry of rawList) {
      const normalized = normalizeRelayQuestion(entry, subject);
      if (!normalized) continue;
      const key = normalizeForDup(normalized.prompt);
      if (seenPrompts.has(key)) {
        inBatchDuplicates += 1;
        continue;
      }
      seenPrompts.add(key);
      questions.push(normalized);
    }

    if (questions.length === 0) {
      return res.status(502).json({
        ok: false,
        code: "bad_output",
        message: `Gemini returned ${rawList.length} entries but none were structurally valid questions. Retry this batch.`,
        rejected: rawList.length,
      });
    }

    /* ---------------- Physics diversity gate + targeted repair ---------------- */
    let repaired = false;
    let correctionsApplied = 0;
    let droppedDominant = 0;
    let repairNotes: string[] = [];
    let rejectedFromRepair = 0;

    if (isPhysics) {
      const assessment = assessPhysicsDiversity(questions, count);

      // Suspected numericals: explanation shows no digits and no working.
      const suspects = questions.filter(numericalNeedsAttention);
      const unclassified = questions.filter((question) => question.type === "unclassified");

      // Deficit: how many more non-numerical questions are needed to clear the floor.
      const nonNumericalNow =
        questions.length - assessment.byType.numerical - assessment.byType.unclassified;
      const deficitCount = Math.max(0, assessment.nonNumericalFloor - nonNumericalNow);
      const deficientTypes = PHYSICS_QUESTION_TYPES.filter(
        (type) => type !== "numerical" && assessment.byType[type] > 0,
      ).slice(0, 2);
      if (deficitCount > 0 && deficientTypes.length === 0) {
        deficientTypes.push("conceptual", "application");
      }

      const needsRepair =
        assessment.issues.length > 0 || suspects.length > 0 || unclassified.length > 0;

      if (needsRepair) {
        repairNotes = [...assessment.issues];
        if (suspects.length > 0) {
          repairNotes.push(
            `${suspects.length} numerical question(s) flagged for answer/unit verification`,
          );
        }
        try {
          const repair = await repairPhysicsBatch({
            subject,
            topicFocus,
            difficulty,
            count,
            existing: questions,
            exclusions: excludePrompts,
            deficitTypes: deficitCount > 0 ? [...new Set(deficientTypes)] : [],
            deficitCount,
            toVerify: suspects.length > 0 ? suspects : assessment.issues.length > 0 && assessment.byType.numerical > 0
              ? questions.filter((question) => question.type === "numerical")
              : [],
            toClassify: unclassified,
          });
          rejectedFromRepair = repair.rejected;

          // Apply corrections in place (matched by normalized prompt).
          for (const question of questions) {
            const fix = repair.corrections.get(normalizeForDup(question.prompt));
            if (fix) {
              question.options = fix.options;
              question.answer = fix.answer;
              question.explanation = fix.explanation;
              if (fix.type !== "unclassified") question.type = fix.type;
              correctionsApplied += 1;
            }
          }

          // Merge genuinely new, non-duplicate questions.
          let addedCount = 0;
          for (const added of repair.added) {
            const key = normalizeForDup(added.prompt);
            if (seenPrompts.has(key)) continue;
            seenPrompts.add(key);
            questions.push(added);
            addedCount += 1;
          }
          if (addedCount > 0) repairNotes.push(`${addedCount} replacement question(s) added`);
          repaired = true;
        } catch (repairErr: any) {
          // A failed repair must never lose the valid first-pass questions.
          repairNotes.push(
            `targeted repair call failed (${String(repairErr?.message || repairErr).slice(0, 120)}); keeping first-pass questions`,
          );
          console.warn("[weekly-gemini] repair failed:", repairErr?.message);
        }
      }

      // Trim back to exactly `count`, dropping from the most abundant type.
      const trim = trimToCount(questions, count);
      questions.splice(0, questions.length, ...trim.kept);
      droppedDominant = trim.dropped;
      if (trim.dropped > 0) {
        repairNotes.push(
          `${trim.dropped} excess question(s) dropped from type "${trim.droppedFrom}" to meet the requested count`,
        );
      }

      if (inBatchDuplicates > 0) repairNotes.push(`${inBatchDuplicates} duplicate prompt(s) removed`);
    }

    return res.json({
      ok: true,
      subject,
      requested: count,
      returned: questions.length,
      rejected: rawList.length - questions.length - inBatchDuplicates + rejectedFromRepair,
      questions,
      ...(isPhysics
        ? {
            types: questions.reduce<Record<string, number>>((acc, question) => {
              acc[question.type] = (acc[question.type] ?? 0) + 1;
              return acc;
            }, {}),
            repaired,
            repair_notes: repairNotes,
            corrections_applied: correctionsApplied,
            dropped_dominant: droppedDominant,
          }
        : {}),
    });
  });
}

startServer();
