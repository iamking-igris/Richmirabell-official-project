export type OnboardingExam = "jamb" | "waec";

export const COMPULSORY_JAMB_SUBJECT = "english";
export const JAMB_OPTIONAL_SUBJECT_LIMIT = 3;

export function normalizeJambSelection(values: string[], availableIds: string[]): string[] {
  const available = new Set(availableIds);
  const selected = values
    .filter((id) => id !== COMPULSORY_JAMB_SUBJECT)
    .map((id) => id.trim().toLowerCase())
    .filter((id, index, list) => available.has(id) && list.indexOf(id) === index);
  return [COMPULSORY_JAMB_SUBJECT, ...selected.slice(0, JAMB_OPTIONAL_SUBJECT_LIMIT)];
}

export function isValidJambSelection(values: string[], availableIds: string[]): boolean {
  const normalized = normalizeJambSelection(values, availableIds);
  return (
    normalized.length === 4 &&
    normalized[0] === COMPULSORY_JAMB_SUBJECT &&
    new Set(normalized).size === 4
  );
}

export function isValidExamMonth(value: string | null, now = new Date()): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month < 1 || month > 12) return false;
  const current = now.getFullYear() * 12 + now.getMonth();
  const selected = year * 12 + (month - 1);
  return selected >= current;
}
