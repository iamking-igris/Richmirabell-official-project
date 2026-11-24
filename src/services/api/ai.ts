import { API_CONFIG, AUTH_TOKEN_KEY } from "./config";

/**
 * Central helper for every AI endpoint that now lives on FastAPI.
 *
 * All AI processing was migrated out of the Express `server.ts` in the
 * frontend repo, so the browser talks to `/api/v1/ai/*` on the backend and
 * never sees the Gemini key.
 *
 * Two error envelopes can come back and both are normalised into a single
 * `AiRequestError`:
 *
 * 1. the legacy Express shape `{ ok: false, message, code? }` — used by the
 *    Gemini failure paths so `cbt.$examId.tsx` can still branch on `code`;
 * 2. FastAPI's `{ detail: { code, message } }` / `{ detail: [...] }` — used by
 *    auth, validation and `AppError`.
 */

/** Default for image OCR + generation calls, which can take a while. */
export const AI_TIMEOUT_MS = 120_000;

export class AiRequestError extends Error {
  /** Alias of `statusCode` — `classifyAiExtractionFailure` reads either. */
  public status: number;
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "AiRequestError";
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
  }
}

type ErrorBody =
  | { ok?: boolean; message?: string; code?: string; detail?: unknown }
  | undefined;

function readError(body: ErrorBody, status: number): { message: string; code?: string } {
  if (!body) return { message: `Request failed with status ${status}` };

  const detail = body.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const record = detail as { code?: string; message?: string };
    return {
      message: record.message || body.message || `Request failed with status ${status}`,
      code: record.code || body.code,
    };
  }
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string; message?: string } | undefined;
    return {
      message: first?.msg || first?.message || body.message || `Request failed with status ${status}`,
      code: body.code,
    };
  }
  if (typeof detail === "string") return { message: detail, code: body.code };
  if (body.message) return { message: body.message, code: body.code };
  return { message: `Request failed with status ${status}`, code: body.code };
}

export interface AiRequestInit extends Omit<RequestInit, "signal"> {
  /** Overrides the default AI timeout (useful for long generations). */
  timeoutMs?: number;
}

/**
 * POST/GET an AI endpoint on the FastAPI backend.
 *
 * Returns the parsed JSON body when the HTTP status is 2xx **and** the body
 * is not an `{ ok: false }` envelope; otherwise throws `AiRequestError`.
 */
export async function aiRequest<T>(
  path: string,
  init: AiRequestInit = {},
): Promise<T> {
  const base = API_CONFIG.baseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  }

  const { timeoutMs = AI_TIMEOUT_MS, headers, ...rest } = init;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(rest.body ? { "Content-Type": "application/json" } : {}),
    ...(headers as Record<string, string> | undefined),
  };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...rest, headers: requestHeaders, signal: controller.signal });
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    throw new AiRequestError(
      aborted
        ? "The AI request took too long and was cancelled. Please try again."
        : "Could not reach the AI service. Check your connection and try again.",
      aborted ? 504 : 0,
      aborted ? "timeout" : "network",
    );
  } finally {
    window.clearTimeout(timer);
  }

  const body = (await response.json().catch(() => undefined)) as ErrorBody & T;

  if (!response.ok) {
    const { message, code } = readError(body, response.status);
    throw new AiRequestError(message, response.status, code);
  }

  // A 2xx response can still carry an `{ ok: false }` envelope.
  if (body && typeof body === "object" && "ok" in body && (body as { ok?: boolean }).ok === false) {
    const { message, code } = readError(body as ErrorBody, response.status);
    throw new AiRequestError(message, response.status, code);
  }

  return body as T;
}
