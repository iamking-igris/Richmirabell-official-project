/**
 * Formatting helpers for the operational admin pages.
 *
 * Backend statuses and sources are raw strings (SUCCESS, PENDING, FAILED,
 * ACTIVE, EXPIRED, PAYMENT, MANUAL). These helpers turn them into readable
 * labels without inventing any data.
 */

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNaira(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return "₦" + value.toLocaleString("en-NG");
}

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Successful",
  SUCCESSFUL: "Successful",
  PENDING: "Pending",
  FAILED: "Failed",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
  PAYMENT: "Payment",
  MANUAL: "Manual grant",
  TRIAL: "Trial",
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  const key = status.toUpperCase();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return key
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function statusTone(status: string | null | undefined): string {
  const key = (status ?? "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "ACTIVE"].includes(key)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["PENDING", "TRIAL"].includes(key)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["FAILED", "EXPIRED", "CANCELLED", "CANCELED"].includes(key)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-line bg-soft text-ink";
}

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return source.toUpperCase() === "MANUAL" ? "Manual grant" : statusLabel(source);
}

export function daysRemaining(endsAt: string | null | undefined): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export function prettyDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
