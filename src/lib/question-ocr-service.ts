import type { ExtractedQuestion, ExtractedAnswer } from "@/types/question-import";
import { classifyAiExtractionFailure } from "@/lib/content-errors";

export type ExtractQuestionsResult =
  | { ok: true; questions: ExtractedQuestion[] }
  | { ok: false; message: string };

export type ExtractAnswersResult =
  | { ok: true; answers: ExtractedAnswer[] }
  | { ok: false; message: string };

/**
 * Calls server endpoint to parse questions from an uploaded examination page.
 */
export async function extractQuestionsFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractQuestionsResult> {
  try {
    const res = await fetch("/api/ocr/extract-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileBase64, mimeType, sourceFileName }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const failure = classifyAiExtractionFailure(
        { statusCode: res.status, code: data?.code, message: data?.message || "Failed to extract questions from page." },
        "Failed to extract questions from page.",
      );
      return {
        ok: false,
        message: failure.message,
      };
    }

    const questions: ExtractedQuestion[] = (data.questions || []).map((q: any) => ({
      ...q,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, questions };
  } catch (err: any) {
    const raw = String(err?.message || "");
    const isNetwork =
      err instanceof TypeError ||
      raw.includes("fetch failed") ||
      raw.includes("Failed to fetch") ||
      raw.includes("NetworkError") ||
      raw.includes("Load failed");
    return {
      ok: false,
      message: isNetwork
        ? "Could not reach the question extraction service. Check that the frontend server is running and try again."
        : raw || "Failed to extract questions from page.",
    };
  }
}

/**
 * Calls server endpoint to parse answer keys and explanations from an uploaded key page.
 */
export async function extractAnswersFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractAnswersResult> {
  try {
    const res = await fetch("/api/ocr/extract-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileBase64, mimeType, sourceFileName }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const failure = classifyAiExtractionFailure(
        { statusCode: res.status, code: data?.code, message: data?.message || "Failed to extract answers from key page." },
        "Failed to extract answers from key page.",
      );
      return {
        ok: false,
        message: failure.message,
      };
    }

    const answers: ExtractedAnswer[] = (data.answers || []).map((a: any) => ({
      ...a,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, answers };
  } catch (err: any) {
    const raw = String(err?.message || "");
    const isNetwork =
      err instanceof TypeError ||
      raw.includes("fetch failed") ||
      raw.includes("Failed to fetch") ||
      raw.includes("NetworkError") ||
      raw.includes("Load failed");
    return {
      ok: false,
      message: isNetwork
        ? "Could not reach the answer extraction service. Check that the frontend server is running and try again."
        : raw || "Failed to extract answers from page.",
    };
  }
}

export type ExtractTheoryResult =
  | { ok: true; theoryQuestions: any[] }
  | { ok: false; message: string };

/**
 * Calls server endpoint to parse and independently solve theory questions from an uploaded page.
 */
export async function extractTheoryFromPage(
  fileBase64: string,
  mimeType: string,
  sourceFileName: string,
  batchId: string,
  sourceFileId: string,
  pageNumber: number = 1
): Promise<ExtractTheoryResult> {
  try {
    const res = await fetch("/api/ocr/extract-theory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileBase64, mimeType, sourceFileName }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const failure = classifyAiExtractionFailure(
        { statusCode: res.status, code: data?.code, message: data?.message || "Failed to extract theory questions from page." },
        "Failed to extract theory questions from page.",
      );
      return {
        ok: false,
        message: failure.message,
      };
    }

    const theoryQuestions = (data.theoryQuestions || []).map((t: any) => ({
      ...t,
      batchId,
      sourceFileId,
      sourceFileName,
      sourcePageNumber: pageNumber,
    }));

    return { ok: true, theoryQuestions };
  } catch (err: any) {
    const raw = String(err?.message || "");
    const isNetwork =
      err instanceof TypeError ||
      raw.includes("fetch failed") ||
      raw.includes("Failed to fetch") ||
      raw.includes("NetworkError") ||
      raw.includes("Load failed");
    return {
      ok: false,
      message: isNetwork
        ? "Could not reach the theory extraction service. Check that the frontend server is running and try again."
        : raw || "Failed to extract theory questions from page.",
    };
  }
}

