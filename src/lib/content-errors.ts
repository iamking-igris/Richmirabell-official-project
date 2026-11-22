import { ApiError } from "@/services/api/errors";

export type AiFailureKind =
  | "daily_quota_exhausted"
  | "rate_limit"
  | "invalid_output"
  | "auth"
  | "network"
  | "unknown";

export interface AiFailureClassification {
  kind: AiFailureKind;
  statusCode: number;
  message: string;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "";
}

export function classifyAiExtractionFailure(
  err: unknown,
  fallback = "The AI extraction service failed. Please try again.",
): AiFailureClassification {
  const payload = err && typeof err === "object" ? err : { message: String(err ?? "") };
  const statusCode =
    ("statusCode" in payload ? Number((payload as { statusCode?: number }).statusCode) : 0) ||
    ("status" in payload ? Number((payload as { status?: number }).status) : 0) || 500;
  const code = (payload as { code?: string }).code ?? "";
  const message = asString((payload as { message?: unknown }).message) || fallback;
  const lowerText = `${code} ${message}`.toLowerCase();

  if (statusCode === 401 || lowerText.includes("unauthenticated") || lowerText.includes("api key") || lowerText.includes("permission denied")) {
    return {
      kind: "auth",
      statusCode: 401,
      message:
        "Gemini authentication is not configured correctly. Please verify the server-side AI settings before retrying.",
    };
  }

  if (
    statusCode === 429 ||
    lowerText.includes("resource_exhausted") ||
    lowerText.includes("quota") ||
    code.includes("daily_quota") ||
    lowerText.includes("daily request quota")
  ) {
    const kind = lowerText.includes("rate") || code.includes("rate") ? "rate_limit" : "daily_quota_exhausted";
    return {
      kind,
      statusCode: 429,
      message:
        kind === "daily_quota_exhausted"
          ? "Gemini's daily request quota has been reached. Your extracted questions and edits are safe. You can resume processing when quota becomes available."
          : "AI processing is temporarily busy. Please wait while we retry safely.",
    };
  }

  if (
    lowerText.includes("could not parse structured output") ||
    lowerText.includes("invalid structured output") ||
    lowerText.includes("empty response") ||
    lowerText.includes("not valid json") ||
    code.includes("invalid_structured_output")
  ) {
    return {
      kind: "invalid_output",
      statusCode: 500,
      message:
        "The AI returned an incomplete or invalid result. Your existing work has been preserved. You can retry this extraction stage.",
    };
  }

  if (
    lowerText.includes("fetch failed") ||
    lowerText.includes("failed to fetch") ||
    lowerText.includes("network") ||
    lowerText.includes("timed out") ||
    lowerText.includes("econnreset") ||
    lowerText.includes("enotfound") ||
    lowerText.includes("etimedout") ||
    statusCode === 503
  ) {
    return {
      kind: "network",
      statusCode: statusCode === 503 ? 503 : 0,
      message: "Connection interrupted. Your completed work is safe. Please reconnect and resume.",
    };
  }

  return {
    kind: "unknown",
    statusCode,
    message: fallback,
  };
}

/**
 * Turns backend/API failures into messages that are safe to show to an admin.
 * Never hides the real reason: 401/403/409 are surfaced explicitly.
 */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 401) return "Your session has expired. Sign in again to continue.";
    if (err.statusCode === 403) return "You do not have permission to perform this action.";
    if (err.statusCode === 408) return "We couldn't complete this request in time. Please try again.";
    if (err.statusCode === 409) {
      const message = err.message.trim();
      if (message && !/backend|api|database|sql|http|endpoint|exception|stack trace/i.test(message)) return message;
      return "This record conflicts with existing content. Please review it and try again.";
    }
    if (err.statusCode === 404) return "This item is no longer available. Refresh and try again.";
    if (err.statusCode >= 500) return "Something went wrong. Please try again shortly.";
    if (err.code === "SERVICE_UNAVAILABLE" || err.code === "TIMEOUT") {
      return "We couldn't complete your request right now. Check your connection and try again.";
    }
  }
  if (err instanceof Error) {
    const message = err.message.trim();
    if (message && !/backend|api|database|sql|http|endpoint|exception|stack trace/i.test(message)) return message;
  }
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 401;
}
