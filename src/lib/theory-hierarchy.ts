import type { TheoryPart, TheoryQuestion } from "@/data/catalog";

/**
 * Calculates hierarchical indentation depth from WAEC/NECO question labels.
 * Depth 0: Main questions (e.g. "1.", "4.", "Question 2", "5")
 * Depth 1: Sub-questions (e.g. "4a.", "1b", "(a)", "4c.")
 * Depth 2+: Sub-sub-questions (e.g. "4a(i)", "1b(ii)", "(iii)", "4b(α)", "4b(β)")
 */
export function getTheoryPartDepth(label: string = ""): number {
  const clean = label.trim().toLowerCase();
  if (!clean) return 0;

  // Sub-sub question indicators: roman numerals or greek letters in parentheses, e.g. (i), (ii), (iii), (iv), (α), (β)
  if (/\([ivxα-ω\d]+\)/i.test(clean) || /\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/i.test(clean)) {
    return 2;
  }

  // e.g. "4a(i)" or "1b(ii)" or "4a.i"
  if (/[0-9]+[a-z]\s*(\(|\.|\b)/i.test(clean)) {
    if (/\([a-z0-9ivxα-ω]+\)/i.test(clean)) {
      return 2;
    }
    return 1;
  }

  // e.g. "4a", "4b.", "a.", "(a)", "(b)"
  if (/^[0-9]+[a-z][.:)]?$/i.test(clean) || /^\(?[a-z]\)?[.:]?$/i.test(clean)) {
    return 1;
  }

  // If contains letters following numbers, it's at least depth 1
  if (/[a-z]/.test(clean.replace(/^(question\s*)?[0-9]+[.\s]*/i, ""))) {
    return 1;
  }

  return 0;
}

/**
 * Returns Tailwind margin class for indentation.
 */
export function getTheoryIndentClass(depth: number): string {
  switch (depth) {
    case 0:
      return "ml-0";
    case 1:
      return "ml-4 sm:ml-6";
    case 2:
    default:
      return "ml-8 sm:ml-10";
  }
}

/**
 * Sanitizes and extracts valid SVG markup.
 * Ensures the SVG contains only valid vector tags, removing unsafe scripts.
 */
export function sanitizeSvg(svgStr?: string): string | undefined {
  if (!svgStr || typeof svgStr !== "string") return undefined;

  let cleaned = svgStr.trim();
  // Strip markdown code fence if present
  cleaned = cleaned.replace(/^```(?:svg|xml|html)?\s*/i, "").replace(/\s*```$/, "").trim();

  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) return undefined;

  let validSvg = svgMatch[0];
  // Remove script tags or dangerous attributes
  validSvg = validSvg.replace(/<script[\s\S]*?<\/script>/gi, "");
  validSvg = validSvg.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Ensure svg has appropriate attributes for responsive display if missing
  if (!validSvg.includes("viewBox") && !validSvg.includes("width")) {
    validSvg = validSvg.replace(/<svg/i, '<svg viewBox="0 0 600 350"');
  }

  return validSvg;
}

/**
 * Normalizes a TheoryQuestion into a structured model with `parts`,
 * ensuring backwards compatibility with older questions that only have `prompt`, `modelAnswer`, and `subparts`.
 */
export function normalizeTheoryQuestion(raw: any, defaultId?: string): TheoryQuestion {
  const id = raw.id || defaultId || `th-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const diagramSvg = sanitizeSvg(raw.diagramSvg || (raw.diagram && raw.diagram.svg));
  const diagramCaption = raw.diagramCaption || (raw.diagram && raw.diagram.caption);

  const parts: TheoryPart[] = [];

  if (Array.isArray(raw.parts) && raw.parts.length > 0) {
    for (const p of raw.parts) {
      parts.push({
        label: String(p.label || "").trim(),
        questionText: String(p.questionText || p.prompt || "").trim(),
        directAnswer: String(p.directAnswer || p.modelAnswer || "").trim(),
        tutorExplanation: String(p.tutorExplanation || p.explanation || p.explain || "").trim(),
        marks: p.marks ? String(p.marks).trim() : undefined,
      });
    }
  } else if (Array.isArray(raw.subparts) && raw.subparts.length > 0) {
    // Convert root prompt if present
    if (raw.prompt && raw.prompt.trim()) {
      parts.push({
        label: raw.questionNumber ? `${raw.questionNumber}.` : "1.",
        questionText: raw.prompt.trim(),
        directAnswer: raw.modelAnswer ? raw.modelAnswer.trim() : "",
        tutorExplanation: raw.explain ? raw.explain.trim() : "",
        marks: raw.marks ? `[${raw.marks} marks]` : undefined,
      });
    }
    // Convert each subpart
    for (const sp of raw.subparts) {
      parts.push({
        label: String(sp.label || "").trim(),
        questionText: String(sp.prompt || sp.questionText || "").trim(),
        directAnswer: String(sp.modelAnswer || sp.directAnswer || "").trim(),
        tutorExplanation: String(sp.tutorExplanation || sp.explain || "").trim(),
        marks: sp.marks ? (typeof sp.marks === "number" ? `[${sp.marks} marks]` : String(sp.marks)) : undefined,
      });
    }
  } else if (raw.prompt) {
    // Single standalone question
    parts.push({
      label: raw.questionNumber ? `${raw.questionNumber}.` : "1.",
      questionText: raw.prompt.trim(),
      directAnswer: raw.modelAnswer ? raw.modelAnswer.trim() : "",
      tutorExplanation: raw.explain ? raw.explain.trim() : "",
      marks: raw.marks ? `[${raw.marks} marks]` : undefined,
    });
  }

  return {
    id,
    introText: raw.introText || (parts.length > 1 ? raw.prompt : undefined),
    prompt: raw.prompt || (parts[0] ? parts[0].questionText : ""),
    modelAnswer: raw.modelAnswer || (parts[0] ? parts[0].directAnswer : ""),
    marks: typeof raw.marks === "number" ? raw.marks : undefined,
    explain: raw.explain,
    subparts: raw.subparts,
    parts,
    diagramSvg,
    diagramCaption,
    needsReview: Boolean(raw.needsReview),
    reviewReason: raw.reviewReason,
    sourceOrigin: raw.sourceOrigin || "ai_solved",
    reviewStatus: raw.reviewStatus || (raw.needsReview ? "Needs Review" : "AI Solved"),
  };
}
