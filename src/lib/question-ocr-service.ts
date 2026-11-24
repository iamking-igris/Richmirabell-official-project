import type { ExtractedQuestion, ExtractedAnswer } from "@/types/question-import";
import { classifyAiExtractionFailure } from "@/lib/content-errors";
import { aiRequest, AiRequestError } from "@/services/api/ai";

export type ExtractQuestionsResult =
  | { ok: true; questions: ExtractedQuestion[] }
  | { ok: false; message: string };

export type ExtractAnswersResult =
  | { ok: true; answers: ExtractedAnswer[] }
  | { ok: false; message: string };

export type ExtractTheoryResult =
  | { ok: true; theoryQuestions: any[] }
  | { ok: false; message: string };

/**
 * Run one OCR extraction call and normalise every failure through
 * `classifyAiExtractionFailure`, exactly as the Express-backed version did —
 * only the transport changed (same-origin `/api/*` → FastAPI `/api/v1/ai/ocr/*`).
 */
async function runOcr<T>(
  path: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await aiRequest<{ ok: boolean } & Record<string, unknown>>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok: true, data: data as T };
  } catch (err) {
    const failure = classifyAiExtractionFailure(
      err instanceof AiRequestError
        ? { statusCode: err.statusCode, code: err.code, message: err.message }
        : { statusCode: 500, message: (err as Error)?.message || fallback },
      fallback,
    );
    return { ok: false, message: failure.message };
  }
}

function networkMessage(err: unknown, fallback: string): string {
  const raw = String((err as Error)?.message || "");
  const isNetwork =
    err instanceof AiRequestError
      ? err.code === "network"
      : err instanceof TypeError ||
        raw.includes("fetch failed") ||
        raw.includes("Failed to fetch") ||
        raw.includes("NetworkError") ||
        raw.includes("Load failed");
  return isNetwork
    ? `Could not reach the extraction service. Check your connection and try again.`
    : raw || fallback;
}

/**
 * Calls the backend to parse questions from an uploaded examination page.
 */
export async function extractQuestionsFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractQuestionsResult> {
  const fallback = "Failed to extract questions from page.";
  try {
    const result = await runOcr<{ questions?: any[] }>(
      "/ai/ocr/extract-questions",
      { fileBase64, mimeType, sourceFileName },
      fallback,
    );
    if (!result.ok) return { ok: false, message: result.message };

    const questions: ExtractedQuestion[] = (result.data.questions || []).map((q: any) => ({
      ...q,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, questions };
  } catch (err) {
    return { ok: false, message: networkMessage(err, fallback) };
  }
}

/**
 * Calls the backend to parse answer keys and explanations from an uploaded key page.
 */
export async function extractAnswersFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractAnswersResult> {
  const fallback = "Failed to extract answers from key page.";
  try {
    const result = await runOcr<{ answers?: any[] }>(
      "/ai/ocr/extract-answers",
      { fileBase64, mimeType, sourceFileName },
      fallback,
    );
    if (!result.ok) return { ok: false, message: result.message };

    const answers: ExtractedAnswer[] = (result.data.answers || []).map((a: any) => ({
      ...a,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, answers };
  } catch (err) {
    return { ok: false, message: networkMessage(err, fallback) };
  }
}

/**
 * Calls the backend to parse and independently solve theory questions from an uploaded page.
 */
export async function extractTheoryFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractTheoryResult> {
  const fallback = "Failed to extract theory questions from page.";
  try {
    const result = await runOcr<{ theoryQuestions?: any[] }>(
      "/ai/ocr/extract-theory",
      { fileBase64, mimeType, sourceFileName },
      fallback,
    );
    if (!result.ok) return { ok: false, message: result.message };

    const theoryQuestions = (result.data.theoryQuestions || []).map((t: any) => ({
      ...t,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, theoryQuestions };
  } catch (err) {
    return { ok: false, message: networkMessage(err, fallback) };
  }
}
