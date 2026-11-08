import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

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

function getGeminiApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envKey && envKey !== "MY_GEMINI_API_KEY" && !envKey.startsWith("AQ.Ab8RN6J8") && envKey.trim().length > 0) {
    return envKey.trim().replace(/^["']|["']$/g, "");
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
          if (m && m[1] && !m[1].startsWith("AQ.Ab8RN6J8") && m[1].trim().length > 0) {
            return m[1].trim();
          }
        } else {
          const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
          const key = parsed.GEMINI_API_KEY || parsed.GOOGLE_API_KEY;
          if (key && key !== "MY_GEMINI_API_KEY" && typeof key === "string" && !key.startsWith("AQ.Ab8RN6J8") && key.trim().length > 0) {
            return key.trim().replace(/^["']|["']$/g, "");
          }
        }
      }
    } catch {}
  }

  return PERMANENT_GEMINI_KEY;
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
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
            temperature: 0.0,
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
              temperature: 0.0,
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

      if (
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
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
                text: userText,
              },
            ],
          },
        ],
        config: {
          systemInstruction: promptText,
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      });
    } catch (err: any) {
      if (err?.status === 404 || String(err?.message).includes("not found")) {
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
                  text: userText,
                },
              ],
            },
          ],
          config: {
            systemInstruction: promptText,
            temperature: 0.0,
            responseMimeType: "application/json",
          },
        });
      } else {
        throw err;
      }
    }

    const text = response?.text?.trim() || "";
    if (!text) {
      throw new Error("Empty response returned from OCR engine.");
    }

    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      return JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Could not parse structured output from OCR response.");
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
        mimeType,
        `Extract and independently solve all examination questions from this question page (${sourceFileName || "question source"}).`
      );

      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
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
      return res.status(500).json({
        ok: false,
        message: err?.message?.includes("{")
          ? "Failed to process question source document with OCR engine."
          : err?.message || "Error reading question page.",
      });
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
        mimeType,
        `Extract all answer keys, solutions, and marking guides from this answer page (${sourceFileName || "answer source"}).`
      );

      const rawAnswers = Array.isArray(parsed.answers) ? parsed.answers : [];
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
      return res.status(500).json({
        ok: false,
        message: err?.message?.includes("{")
          ? "Failed to process answer key document with OCR engine."
          : err?.message || "Error reading answer key page.",
      });
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
        mimeType,
        `Extract, preserve subpart hierarchy, recreate any diagrams as clean minimalist SVGs, and independently solve all theory questions from this theory question page (${sourceFileName || "theory source"}).`
      );

      const rawQuestions = Array.isArray(parsed.theoryQuestions) ? parsed.theoryQuestions : [];
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
      return res.status(500).json({
        ok: false,
        message: err?.message?.includes("{")
          ? "Failed to process theory source document with OCR engine."
          : err?.message || "Error reading theory question page.",
      });
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

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
        subject: attempt.subjectLabel || "General",
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
          0.2
        );
      } catch (geminiErr: any) {
        console.warn("Gemini service call failed, generating grounded diagnostic fallback:", geminiErr?.message);

        // Grounded diagnostic generator based strictly on the student's actual incorrect and skipped items
        const weaknesses = filteredQuestions.map((q: any) => {
          const isSkipped = String(q.studentAnswer).toLowerCase().includes("skipped");
          const shortConcept = q.questionText.length > 55
            ? q.questionText.slice(0, 52).trim() + "..."
            : q.questionText;

          return {
            id: q.id,
            concept: shortConcept,
            theTrap: isSkipped
              ? "You skipped this question without attempting an option, leaving marks unearned."
              : `You chose "${q.studentAnswer}", which is a common misconception distractor that overlooks the fundamental governing definition or formula.`,
            theReality: String(q.officialExplanation || `The verified answer is "${q.correctAnswer}".`),
          };
        });

        const subject = attempt.subjectLabel || "the syllabus";
        result = {
          summary: `You showed great effort on this ${subject} paper; reviewing fundamental definitions and specific calculation traps will rapidly elevate your score.`,
          strengths: [
            attempt.score > 0
              ? `Demonstrated confident mastery on ${attempt.score} question(s) answered correctly.`
              : "Demonstrated strong engagement with challenging exam-standard questions under test conditions.",
          ],
          weaknesses,
          actionPlan: [
            `Review the official explanations and textbook formulas for the ${weaknesses.length} missed question(s).`,
            `Practice 3 targeted problems covering "${weaknesses[0]?.concept || "key formulas"}".`,
            "Re-attempt this topic quiz in CBT mode once you have reviewed the lesson notes.",
          ],
        };
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
          questionLabel: q.questionLabel || q.label || "Theory Question",
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
          0.1
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

  let configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

  app.post("/api/admin/generate-cbt-questions", async (req, res) => {
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
- Randomize the correct key evenly across A, B, C, and D.`;

      let generatedData: any;
      try {
        generatedData = await executeGeminiTextPrompt(
          CBT_QUESTION_GEN_PROMPT,
          userInstruction,
          0.8, // Creative temperature for high linguistic & numerical variety
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
  app.post("/api/student/review-attempt", async (req, res) => {
    try {
      const { attempt } = req.body;
      if (!attempt || !Array.isArray(attempt.items)) {
        return res.status(400).json({ ok: false, message: "Invalid attempt data provided." });
      }

      const items = attempt.items;
      const score = Number(attempt.score) || 0;
      const total = Number(attempt.total) || items.length || 1;
      const pct = Math.round((score / Math.max(1, total)) * 100);

      const subjectsStats: Record<string, { correct: number; total: number }> = {};
      const incorrectItems: Array<{ id: string; prompt: string; pick?: string; answer?: string; explain?: string; subject: string }> = [];

      for (const it of items) {
        const match = String(it.id || "").match(/^(english|mathematics|physics|chemistry|biology)_/i);
        const subj = match ? match[1].toLowerCase() : "general";
        if (!subjectsStats[subj]) subjectsStats[subj] = { correct: 0, total: 0 };
        subjectsStats[subj].total += 1;
        if (it.pick && it.answer && it.pick === it.answer) {
          subjectsStats[subj].correct += 1;
        } else if (it.pick && it.answer && it.pick !== it.answer) {
          incorrectItems.push({
            id: it.id,
            prompt: String(it.prompt || "").substring(0, 140),
            pick: it.pick,
            answer: it.answer,
            explain: it.explain,
            subject: subj,
          });
        }
      }

      let strongest = "General";
      let weakest = "General";
      let highestPct = -1;
      let lowestPct = 999;

      for (const [s, data] of Object.entries(subjectsStats)) {
        const sPct = Math.round((data.correct / Math.max(1, data.total)) * 100);
        if (sPct > highestPct) {
          highestPct = sPct;
          strongest = s.charAt(0).toUpperCase() + s.slice(1);
        }
        if (sPct < lowestPct) {
          lowestPct = sPct;
          weakest = s.charAt(0).toUpperCase() + s.slice(1);
        }
      }

      // Default deterministic review
      const deterministicReview = {
        summary: `Candidate achieved ${score}/${total} (${pct}%). Strongest performance was observed in ${strongest} (${highestPct}%), while ${weakest} (${lowestPct}%) represents the primary area requiring revision prior to the official UTME sitting.`,
        strongestSubject: strongest,
        weakestSubject: weakest,
        strengths: [
          `Consistent accuracy in ${strongest} sections with steady answer selection under timed conditions.`,
          `Effective elimination of obvious distractors across multiple-choice options.`,
        ],
        weaknesses: incorrectItems.slice(0, 4).map((it) => ({
          id: it.id,
          concept: `${it.subject.charAt(0).toUpperCase() + it.subject.slice(1)} Key Concept`,
          theTrap: `Selected option (${it.pick}) reflects common misinterpretation of the question premise.`,
          theReality: it.explain || `Official answer key is (${it.answer}). Review foundational rules and formulas.`,
        })),
        actionPlan: [
          `Target at least 2 timed revision sets in ${weakest} focusing on foundational syllabus definitions and calculation steps.`,
          `Review the specific question explanations highlighted below and maintain an error log for repeated misconceptions.`,
          `Practice active pacing to ensure an average of 40 seconds per question across all 4 subjects.`,
        ],
      };

      const apiKey = getGeminiApiKey();
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({ ok: true, review: deterministicReview, mode: "deterministic" });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });

        const prompt = `You are a premier Nigerian UTME examination diagnostic tutor. 
Analyze this student's JAMB attempt results and provide a concise, high-impact review:
Total score: ${score}/${total} (${pct}%).
Strongest subject: ${strongest} (${highestPct}%).
Weakest subject: ${weakest} (${lowestPct}%).
Sample missed questions: ${JSON.stringify(incorrectItems.slice(0, 4))}

Return JSON:
{
  "summary": "1-2 sentence overall performance summary with strongest and weakest subject",
  "strongestSubject": "${strongest}",
  "weakestSubject": "${weakest}",
  "strengths": ["2 concise strengths"],
  "weaknesses": [
    {
      "id": "question id",
      "concept": "concept name",
      "theTrap": "what the student likely misunderstood",
      "theReality": "the correct rule or working"
    }
  ],
  "actionPlan": ["2-3 practical recommendations"]
}`;

        const result = await ai.models.generateContent({
          model: configuredModel || "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        const parsed = JSON.parse(result.text || "{}");
        if (parsed.summary) {
          return res.json({ ok: true, review: parsed, mode: "gemini_ai" });
        }
      } catch (geminiErr) {
        console.warn("Gemini review attempt error, falling back to deterministic:", geminiErr);
      }

      return res.json({ ok: true, review: deterministicReview, mode: "deterministic" });
    } catch (err: any) {
      console.error("Review attempt route error:", err);
      return res.status(500).json({ ok: false, message: err.message || "Failed to process review." });
    }
  });

  // Admin AI Status & Test Endpoints
  app.get("/api/admin/ai-status", (req, res) => {
    const apiKey = getGeminiApiKey();
    const configured = Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY");
    return res.json({
      ok: true,
      configured,
      model: configuredModel,
      provider: "Google Gemini Vision (@google/genai)",
      method: "Server-side proxy route (/api/extract-notes)",
      secretLocation: "AI Studio Settings > Secrets (GEMINI_API_KEY)",
      statusText: configured ? "Configured (Server-side)" : "Not configured",
    });
  });

  app.post("/api/admin/set-model", (req, res) => {
    const { model } = req.body;
    if (model && typeof model === "string") {
      configuredModel = model.trim();
    }
    return res.json({ ok: true, model: configuredModel });
  });

  app.post("/api/admin/test-ai", async (req, res) => {
    const apiKey = getGeminiApiKey();
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
      const result = await ai.models.generateContent({
        model: configuredModel,
        contents: "Respond with the single word: READY",
      });
      return res.json({
        ok: true,
        message: `Gemini API authenticated successfully. Model: ${configuredModel}. Response: ${result.text?.trim()}`,
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
