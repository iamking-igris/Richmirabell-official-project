import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Info,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
  RotateCw,
  Plug,
  Activity,
} from "lucide-react";
import {
  adminApi,
  type AiStatus,
  type PlatformSettingsResponse,
} from "@/lib/backend";
import { aiOcrSettings } from "@/lib/ai-settings";
import type { AiOcrSettings } from "@/types/ai-settings";
import { useSession } from "@/lib/session";
import { API_CONFIG } from "@/services/api/config";
import { ApiError } from "@/services/api/errors";
import { AdminError, AdminField, AdminLoading, AdminPanel } from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/settings/$category")({
  component: AdminSettingsCategoryPage,
});

const CATEGORY_TITLES: Record<string, { title: string; description: string }> = {
  general: {
    title: "General Platform",
    description: "Platform name and core platform information.",
  },
  academic: {
    title: "Learning & Content",
    description: "Subject configuration and content publishing status.",
  },
  examinations: {
    title: "Examinations",
    description: "Default CBT duration and the fixed Weekly CBT paper rules.",
  },
  users: {
    title: "Users & Access",
    description: "Registration, account access and administrator details.",
  },
  ai: {
    title: "Gemini AI & OCR",
    description:
      "The Gemini API key, model and connection used by every AI feature: note extraction, question OCR, theory marking and CBT question generation. The key stays server-side and is never shown in the browser.",
  },
  payments: {
    title: "Payments & Integrations",
    description: "Paystack credentials, integration status and backend connection.",
  },
  system: {
    title: "System Status",
    description: "Backend and AI service health, diagnostics and audit log.",
  },
};

/** Older bookmarked URLs keep working by mapping onto the new categories. */
const LEGACY_ALIASES: Record<string, string> = {
  notifications: "system",
  security: "users",
  integrations: "payments",
  developer: "system",
  advanced: "system",
  gemini: "ai",
};

function readSettingsError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type SettingsMessage = { ok: boolean; text: string } | null;

function SettingsFeedback({ message }: { message: SettingsMessage }) {
  if (!message) return null;
  return (
    <p
      className={cn(
        "mt-3 inline-flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
        message.ok
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-red-50 text-red-700 border border-red-100",
      )}
      role="status"
    >
      {message.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      {message.text}
    </p>
  );
}

function UpdatedStamp({
  at,
  by,
  className,
}: {
  at: string | null | undefined;
  by?: string | null;
  className?: string;
}) {
  if (!at) return <span className={cn("text-xs text-muted", className)}>Never changed</span>;
  const when = new Date(at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  return (
    <span className={cn("text-xs text-muted", className)}>
      Last updated {when}
      {by ? ` by ${by}` : ""}
    </span>
  );
}

function usePlatformSettings() {
  const [data, setData] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.platformSettings());
    } catch (err) {
      setError(readSettingsError(err, "Could not load platform settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function AdminSettingsCategoryPage() {
  const params = useParams({ strict: false }) as { category?: string };
  const requested = params.category ?? "general";
  const category = LEGACY_ALIASES[requested] ?? requested;
  const meta = CATEGORY_TITLES[category];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to settings
      </Link>

      <header>
        <h1 className="font-display text-3xl sm:text-4xl">{meta?.title ?? "Settings"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {meta?.description ?? "This settings category is not available."}
        </p>
      </header>

      {category === "general" && <GeneralPanel />}
      {category === "academic" && <LearningPanel />}
      {category === "examinations" && <ExaminationsPanel />}
      {category === "users" && <UsersPanel />}
      {category === "ai" && <AiOcrSettingsPanel />}
      {category === "payments" && <PaymentsPanel />}
      {category === "system" && <SystemPanel />}

      {!meta && (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <AlertTriangle className="mx-auto size-10 text-amber-500" aria-hidden />
          <h2 className="mt-3 font-display text-xl font-bold text-ink">Unknown category</h2>
          <p className="mt-1 text-sm text-muted">
            The requested settings category was not found.
          </p>
          <Link
            to="/admin/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-fg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to settings
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* General                                                                    */
/* ------------------------------------------------------------------------- */

function GeneralPanel() {
  const { data, loading, error, reload } = usePlatformSettings();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);

  useEffect(() => {
    if (data) setName(data.general.platform_name);
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80) {
      setMessage({ ok: false, text: "Platform name must be between 1 and 80 characters." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformSetting("general", { platform_name: trimmed });
      setMessage({ ok: true, text: "Platform name saved." });
      await reload();
    } catch (err) {
      setMessage({ ok: false, text: readSettingsError(err, "Could not save the platform name.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading platform settings…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Platform identity"
            description="Shown in the API health payload and used as the platform display name."
          >
            <form onSubmit={save} className="space-y-4 p-4">
              <AdminField label="Platform name">
                <input
                  type="text"
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                  placeholder="Richmirabel"
                />
              </AdminField>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <UpdatedStamp at={data.general.updated_at} by={data.general.updated_by} />
                <button
                  type="submit"
                  disabled={saving || !name.trim() || name.trim() === data.general.platform_name}
                  className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
              <SettingsFeedback message={message} />
            </form>
          </AdminPanel>

          <AdminPanel title="Platform information" description="Read-only details from the backend.">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Environment">
                <span className="font-mono text-xs">{data.info.environment}</span>
              </AdminField>
              <AdminField label="API service name">
                <span className="font-mono text-xs">{data.info.app_name}</span>
              </AdminField>
              <AdminField label="Frontend URL">
                <span className="font-mono text-xs">{data.info.frontend_url}</span>
              </AdminField>
              <AdminField label="Session lifetime">
                {data.info.session_ttl_hours} hours
              </AdminField>
              <AdminField label="Free trial">
                {data.info.trial_days} days
              </AdminField>
              <AdminField label="Monthly plan">
                ₦{data.info.monthly_price_ngn.toLocaleString()} · {data.info.monthly_days} days
              </AdminField>
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Learning & Content                                                         */
/* ------------------------------------------------------------------------- */

function LearningPanel() {
  const { data, loading, error, reload } = usePlatformSettings();

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading content status…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Subjects"
            description="The configured JAMB subject set and how much published content each one has."
          >
            <div className="divide-y divide-line">
              {data.learning.subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{subject.name}</p>
                    <p className="text-xs text-muted">
                      {subject.published_topics} published · {subject.draft_topics} draft ·{" "}
                      {subject.total_topics} total
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                      subject.published_topics > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100",
                    )}
                  >
                    {subject.published_topics > 0 ? "Live content" : "No published content"}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3 text-xs text-muted">
              {data.learning.published_topics} published and {data.learning.draft_topics} draft{" "}
              {data.learning.draft_topics === 1 ? "topic" : "topics"} across all subjects.
            </div>
          </AdminPanel>

          <AdminPanel
            title="Content publishing"
            description="Publishing is managed per topic on the content pages."
          >
            <div className="flex flex-wrap gap-3 p-4">
              <Link
                to="/admin/subjects"
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
              >
                Subjects &amp; content
              </Link>
              <Link
                to="/admin/topics"
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
              >
                Topics &amp; publishing
              </Link>
              <Link
                to="/admin/notes"
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
              >
                Notes workspace
              </Link>
            </div>
            <div className="border-t border-line px-4 py-3 text-xs text-muted">
              There is no global content switch: each topic is published or unpublished
              individually so students only ever see reviewed material.
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Examinations                                                               */
/* ------------------------------------------------------------------------- */

function ExaminationsPanel() {
  const { data, loading, error, reload } = usePlatformSettings();
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);

  useEffect(() => {
    if (data) setDuration(String(data.examinations.default_duration_minutes));
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    const value = Number(duration);
    const { duration_min: min, duration_max: max } = data.examinations;
    if (!Number.isInteger(value) || value < min || value > max) {
      setMessage({ ok: false, text: `Duration must be a whole number between ${min} and ${max} minutes.` });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformSetting("examinations", { default_duration_minutes: value });
      setMessage({ ok: true, text: "Default examination duration saved." });
      await reload();
    } catch (err) {
      setMessage({
        ok: false,
        text: readSettingsError(err, "Could not save the default duration."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading examination settings…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Default examination duration"
            description="Applied when a new Weekly CBT draft is created without an explicit duration. Existing examinations keep the duration they were created with."
          >
            <form onSubmit={save} className="space-y-4 p-4">
              <AdminField label="Duration (minutes)">
                <input
                  type="number"
                  min={data.examinations.duration_min}
                  max={data.examinations.duration_max}
                  step={1}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </AdminField>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <UpdatedStamp
                  at={data.examinations.updated_at}
                  by={data.examinations.updated_by}
                />
                <button
                  type="submit"
                  disabled={saving || duration === String(data.examinations.default_duration_minutes)}
                  className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
              <SettingsFeedback message={message} />
            </form>
          </AdminPanel>

          <AdminPanel
            title="Weekly CBT paper rules"
            description="The fixed structure of every student attempt. These values come from the examination system and are not editable here."
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Questions per attempt">
                {data.examinations.paper_total_questions}
              </AdminField>
              <AdminField label="Use of English">
                {data.examinations.english_questions} questions (compulsory)
              </AdminField>
              <AdminField label="Registered electives">
                {data.examinations.elective_count} subjects ×{" "}
                {data.examinations.elective_questions_each} questions
              </AdminField>
              <AdminField label="Paper assembly">
                Server-assembled from the approved question pool
              </AdminField>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-xs text-muted">
                Changing the default duration never alters question counts, timing rules for
                running attempts, or already-created papers.
              </p>
              <Link
                to="/admin/cbt"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open CBT Generator
              </Link>
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Users & Access                                                             */
/* ------------------------------------------------------------------------- */

function UsersPanel() {
  const { data, loading, error, reload } = usePlatformSettings();
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);
  const name = useSession((state) => state.name);
  const email = useSession((state) => state.email);
  const role = useSession((state) => state.role);
  const status = useSession((state) => state.status);

  useEffect(() => {
    if (data) setRegistrationOpen(data.users.registration_open);
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformSetting("users", { registration_open: registrationOpen });
      setMessage({
        ok: true,
        text: registrationOpen
          ? "New registrations are open."
          : "New registrations are closed.",
      });
      await reload();
    } catch (err) {
      setMessage({
        ok: false,
        text: readSettingsError(err, "Could not save the registration setting."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading access settings…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Registration"
            description="Controls whether new student accounts can be created. Existing accounts are always unaffected."
          >
            <form onSubmit={save} className="space-y-4 p-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(event) => setRegistrationOpen(event.target.checked)}
                  className="size-4 rounded border-line text-primary accent-primary"
                />
                <span className="text-sm text-ink">Accept new student registrations</span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <UpdatedStamp at={data.users.updated_at} by={data.users.updated_by} />
                <button
                  type="submit"
                  disabled={
                    saving || registrationOpen === data.users.registration_open
                  }
                  className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
              <SettingsFeedback message={message} />
            </form>
          </AdminPanel>

          <AdminPanel title="Accounts" description="Live counts and access policy from the backend.">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Students">{data.users.student_count}</AdminField>
              <AdminField label="Administrators">{data.users.admin_count}</AdminField>
              <AdminField label="Session lifetime">
                {data.users.session_ttl_hours} hours
              </AdminField>
              <AdminField label="Password reset window">
                {data.users.password_reset_ttl_minutes} minutes
              </AdminField>
              <AdminField label="Registration rate limit">
                {data.users.register_rate_limit
                  ? `${data.users.register_rate_limit} per minute per IP`
                  : "Rate limiting disabled"}
              </AdminField>
              <AdminField label="Account management">
                <Link to="/admin/students" className="font-semibold text-primary hover:underline">
                  Open Students
                </Link>
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Administrator account"
            description="Read-only details from the current authenticated session."
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Name">
                <span className="inline-flex items-center gap-2">
                  <User className="size-4 text-muted" aria-hidden />
                  {name || "Not available"}
                </span>
              </AdminField>
              <AdminField label="Email">{email || "Not available"}</AdminField>
              <AdminField label="Role">{role ?? "Not available"}</AdminField>
              <AdminField label="Session status">{status}</AdminField>
            </div>
            <div className="border-t border-line px-4 py-3 text-xs text-muted">
              Password and credential management use the standard sign-in and password reset
              flow. Credentials are never stored in browser settings.
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Gemini AI & OCR                                                            */
/* ------------------------------------------------------------------------- */

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const KEY_SOURCE_LABELS: Record<string, string> = {
  saved: "Saved in admin settings",
  environment: "Server environment (GEMINI_API_KEY)",
  file: "Server environment file",
  builtin: "Built-in server default",
  none: "Not configured",
};

function AiOcrSettingsPanel() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);
  const [localSettings, setLocalSettings] = useState<AiOcrSettings>(aiOcrSettings.getSettings());
  const [keyInput, setKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SettingsMessage>(null);

  const QUALITY_OPTIONS: { value: AiOcrSettings["ocrQuality"]; label: string; hint: string }[] = [
    { value: "fast", label: "Fast", hint: "Smaller images, quicker extraction, lower detail" },
    { value: "standard", label: "Standard", hint: "Balanced quality and speed (default)" },
    { value: "high", label: "High", hint: "Full resolution, best detail, slower extraction" },
  ];

  const LATEX_OPTIONS: { value: AiOcrSettings["latexOutput"]; label: string }[] = [
    { value: "katex", label: "KaTeX" },
    { value: "latex", label: "LaTeX" },
  ];

  const modelOptions = useMemo(() => {
    const list = [...(status?.models?.length ? status.models : FALLBACK_MODELS)];
    if (status?.model && !list.includes(status.model)) list.unshift(status.model);
    return list;
  }, [status]);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setMessage(null);
    try {
      const st = await adminApi.aiStatus();
      setStatus(st);
      // Sync local settings with server model if available
      if (st.model) {
        aiOcrSettings.updateSettings({ model: st.model });
        setLocalSettings(aiOcrSettings.getSettings());
      }
      if (st.temperatures) {
        aiOcrSettings.updateSettings({
          temperatureOcr: st.temperatures.ocr,
          temperatureReview: st.temperatures.review,
          temperatureTheory: st.temperatures.theory,
          temperatureCbt: st.temperatures.cbt,
        });
        setLocalSettings(aiOcrSettings.getSettings());
      }
    } catch (err) {
      setMessage({
        ok: false,
        text: readSettingsError(err, "Could not load AI status."),
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    if (!keyInput.trim()) return;
    setKeyBusy(true);
    setMessage(null);
    try {
      const next = await adminApi.saveGeminiConfig({ apiKey: keyInput.trim() });
      setStatus(next);
      setKeyInput("");
      if (next.model) {
        aiOcrSettings.updateSettings({ model: next.model });
        setLocalSettings(aiOcrSettings.getSettings());
      }
      setMessage({
        ok: true,
        text: "API key saved. Every Gemini feature now uses it — no restart needed.",
      });
    } catch (err) {
      setMessage({ ok: false, text: readSettingsError(err, "Could not save the API key.") });
    } finally {
      setKeyBusy(false);
    }
  }

  async function clearKey() {
    setKeyBusy(true);
    setMessage(null);
    try {
      const next = await adminApi.saveGeminiConfig({ clearKey: true });
      setStatus(next);
      setMessage({
        ok: true,
        text: "Saved key removed. The server fell back to its environment key.",
      });
    } catch (err) {
      setMessage({ ok: false, text: readSettingsError(err, "Could not remove the API key.") });
    } finally {
      setKeyBusy(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminApi.testAi();
      setTestResult({ ok: true, text: result.message });
    } catch (err) {
      setTestResult({ ok: false, text: readSettingsError(err, "Connection test failed.") });
    } finally {
      setTesting(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    let ok = true;
    let detail = "";

    try {
      await adminApi.setModel({ model: localSettings.model });
    } catch (err) {
      ok = false;
      detail = readSettingsError(err, "Failed to save model.");
    }

    if (ok) {
      try {
        await adminApi.setTemperature({
          category: "ocr",
          temperature: localSettings.temperatureOcr,
        });
      } catch (err) {
        ok = false;
        detail = readSettingsError(err, "Failed to save OCR temperature.");
      }
    }

    if (ok) {
      try {
        await adminApi.setTemperature({
          category: "review",
          temperature: localSettings.temperatureReview,
        });
      } catch (err) {
        ok = false;
        detail = readSettingsError(err, "Failed to save review temperature.");
      }
    }

    if (ok) {
      try {
        await adminApi.setTemperature({
          category: "theory",
          temperature: localSettings.temperatureTheory,
        });
      } catch (err) {
        ok = false;
        detail = readSettingsError(err, "Failed to save theory temperature.");
      }
    }

    if (ok) {
      try {
        await adminApi.setTemperature({
          category: "cbt",
          temperature: localSettings.temperatureCbt,
        });
      } catch (err) {
        ok = false;
        detail = readSettingsError(err, "Failed to save CBT temperature.");
      }
    }

    if (ok) {
      aiOcrSettings.updateSettings(localSettings);
      setMessage({ ok: true, text: "AI settings saved." });
      void loadStatus();
    } else {
      setMessage({ ok: false, text: detail || "Failed to save settings." });
    }

    setSaving(false);
  }

  function resetDefaults() {
    const defaults = aiOcrSettings.resetToDefaults();
    setLocalSettings(defaults);
    setMessage({ ok: true, text: "Settings reset to defaults." });
  }

  return (
    <AdminPanel
      title="Gemini AI & OCR Settings"
      description="One shared configuration for note extraction, question OCR, theory marking, attempt review and CBT question generation. The API key stays on the server and is never returned to the browser."
    >
      {loading && <AdminLoading label="Loading AI status…" />}

      {!loading && status && (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <AdminField label="Provider">
            <span className="font-mono text-xs">{status.provider}</span>
          </AdminField>
          <AdminField label="Method">
            <span className="font-mono text-xs">{status.method}</span>
          </AdminField>
          <AdminField label="Configuration status">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                status.configured
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-700 border-red-100",
              )}
            >
              {status.statusText}
            </span>
          </AdminField>
          <AdminField label="Active key">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <KeyRound className="size-3.5 text-muted" aria-hidden />
              {status.keyHint || "None"}
              <span className="font-sans text-muted">
                ({KEY_SOURCE_LABELS[status.keySource ?? ""] ?? status.keySource ?? "unknown"})
              </span>
            </span>
          </AdminField>
          <AdminField label="Secret location">
            <span className="font-mono text-xs text-muted">{status.secretLocation}</span>
          </AdminField>
          <AdminField label="Last configuration change">
            <UpdatedStamp at={status.updatedAt} by={status.updatedBy} />
          </AdminField>
        </div>
      )}

      {!loading && (
        <>
          {/* ---- API key ---- */}
          <div className="space-y-3 border-t border-line p-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
                htmlFor="gemini-api-key"
              >
                Gemini API key
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="gemini-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={keyInput}
                  onChange={(event) => setKeyInput(event.target.value)}
                  placeholder={
                    status?.keyHint
                      ? `Enter a new key to replace ${status.keyHint}`
                      : "Paste a Gemini API key"
                  }
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveKey()}
                    disabled={keyBusy || keyInput.trim().length < 20}
                    className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
                  >
                    {keyBusy ? "Saving…" : "Save key"}
                  </button>
                  {status?.keySource === "saved" && (
                    <button
                      type="button"
                      onClick={() => void clearKey()}
                      disabled={keyBusy}
                      className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted hover:bg-paper disabled:opacity-50"
                    >
                      Remove saved key
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">
                Replacing the key takes effect immediately for OCR, notes extraction, review and
                CBT generation. The stored key is only ever shown as a masked hint.
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
                htmlFor="gemini-model"
              >
                Gemini model
              </label>
              <select
                id="gemini-model"
                value={localSettings.model}
                onChange={(event) =>
                  setLocalSettings((prev) => ({ ...prev, model: event.target.value }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Used by every server-side AI route. Changes are persisted and take effect on the
                next request.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void testConnection()}
                disabled={testing}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
              >
                <Plug className={cn("size-4", testing && "animate-pulse")} aria-hidden />
                {testing ? "Testing connection…" : "Test connection"}
              </button>
              {testResult && (
                <p
                  className={cn(
                    "inline-flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
                    testResult.ok
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-red-50 text-red-700 border border-red-100",
                  )}
                  role="status"
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  {testResult.text}
                </p>
              )}
            </div>
          </div>

          {/* ---- Temperatures & OCR preferences ---- */}
          <div className="space-y-4 border-t border-line p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  OCR Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperatureOcr}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      temperatureOcr: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between mt-1 text-xs text-muted">
                  <span>0.0 (deterministic)</span>
                  <span>{localSettings.temperatureOcr}</span>
                  <span>1.0 (creative)</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Temperature for note extraction OCR. Lower = more consistent, higher = more varied.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Review Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperatureReview}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      temperatureReview: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between mt-1 text-xs text-muted">
                  <span>0.0</span>
                  <span>{localSettings.temperatureReview}</span>
                  <span>1.0</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Temperature for student attempt review diagnostics.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Theory Marking Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperatureTheory}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      temperatureTheory: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between mt-1 text-xs text-muted">
                  <span>0.0</span>
                  <span>{localSettings.temperatureTheory}</span>
                  <span>1.0</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Temperature for theory question marking.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  CBT Generation Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localSettings.temperatureCbt}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      temperatureCbt: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex justify-between mt-1 text-xs text-muted">
                  <span>0.0</span>
                  <span>{localSettings.temperatureCbt}</span>
                  <span>1.0</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Temperature for AI CBT question generation. Higher = more creative variety.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                OCR Quality Mode
              </label>
              <div className="flex flex-wrap gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setLocalSettings((prev) => ({ ...prev, ocrQuality: opt.value }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-semibold transition-colors",
                      localSettings.ocrQuality === opt.value
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-line bg-surface text-muted hover:border-primary hover:text-ink",
                    )}
                  >
                    <span>{opt.label}</span>
                    <span className="ml-1 text-[10px] opacity-60">{opt.hint}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                Image preprocessing quality before sending to the OCR engine. Affects extraction
                clarity and speed on this device.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.formulaDetection}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({ ...prev, formulaDetection: e.target.checked }))
                  }
                  className="rounded border-line text-primary accent-primary"
                />
                <span className="text-sm text-ink">Enable formula/LaTeX detection in OCR</span>
              </label>
              <p className="mt-1 text-xs text-muted">
                When enabled, the OCR engine converts inline math expressions to KaTeX LaTeX
                notation during extraction.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                LaTeX Output Preference
              </label>
              <select
                value={localSettings.latexOutput}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, latexOutput: e.target.value as "katex" | "latex" }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              >
                {LATEX_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Preferred rendering format for mathematical expressions in extracted notes.
              </p>
            </div>
          </div>

          <div className="border-t border-line pt-6 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={resetDefaults}
                className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted disabled:opacity-50 hover:bg-paper"
              >
                <RotateCw className="size-4 mr-2" /> Reset to Defaults
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSettings()}
                className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save AI Settings"}
              </button>
            </div>
            <SettingsFeedback message={message} />
          </div>

          <div className="border-t border-line pt-4 mt-6 px-4 pb-4">
            <p className="text-xs text-muted">
              <strong>Persistence:</strong> API key, model and temperatures are stored on the
              server and apply to every device and every Gemini feature. OCR quality, formula
              detection and LaTeX format are device preferences kept in this browser.
            </p>
          </div>
        </>
      )}
    </AdminPanel>
  );
}

/* ------------------------------------------------------------------------- */
/* Payments & Integrations                                                    */
/* ------------------------------------------------------------------------- */

function PaymentsPanel() {
  const { data, loading, error, reload } = usePlatformSettings();
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value: Record<string, string> = {};
    if (publicKey.trim()) value.paystack_public_key = publicKey.trim();
    if (secretKey.trim()) value.paystack_secret_key = secretKey.trim();
    if (Object.keys(value).length === 0) {
      setMessage({ ok: false, text: "Enter a public and/or secret key first." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformSetting("payments", value);
      setPublicKey("");
      setSecretKey("");
      setMessage({ ok: true, text: "Paystack credentials saved." });
      await reload();
    } catch (err) {
      setMessage({
        ok: false,
        text: readSettingsError(err, "Could not save the Paystack credentials."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearKeys() {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updatePlatformSetting("payments", {
        paystack_public_key: "",
        paystack_secret_key: "",
      });
      setMessage({ ok: true, text: "Saved credentials cleared." });
      await reload();
    } catch (err) {
      setMessage({
        ok: false,
        text: readSettingsError(err, "Could not clear the credentials."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading payment settings…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Paystack status"
            description="Card, bank transfer and USSD checkout for subscriptions."
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Status">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                    data.payments.configured
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100",
                  )}
                >
                  {data.payments.configured ? "Configured" : "Not configured"}
                </span>
              </AdminField>
              <AdminField label="Credential source">
                {data.payments.source === "settings"
                  ? "Saved in admin settings"
                  : data.payments.source === "environment"
                    ? "Server environment"
                    : "No credentials"}
              </AdminField>
              <AdminField label="Public key hint">
                <span className="font-mono text-xs">
                  {data.payments.public_key_hint || "—"}
                </span>
              </AdminField>
              <AdminField label="Secret key hint">
                <span className="font-mono text-xs">
                  {data.payments.secret_key_hint || "—"}
                </span>
              </AdminField>
              <AdminField label="API base">
                <span className="font-mono text-xs">{data.payments.base_url}</span>
              </AdminField>
              <AdminField label="Pricing plans">
                <Link
                  to="/admin/subscriptions"
                  className="font-semibold text-primary hover:underline"
                >
                  Manage plans
                </Link>
              </AdminField>
            </div>
            <div className="border-t border-line px-4 py-3">
              <UpdatedStamp at={data.payments.updated_at} by={data.payments.updated_by} />
            </div>
          </AdminPanel>

          <AdminPanel
            title="Paystack credentials"
            description="Enter your keys when your Paystack account is available. Keys are stored server-side, used for payment initialisation, verification and webhook signing, and never returned to the browser."
          >
            <form onSubmit={save} className="space-y-4 p-4">
              <AdminField label="Public key (pk_…)">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={publicKey}
                  onChange={(event) => setPublicKey(event.target.value)}
                  placeholder={data.payments.public_key_hint || "pk_test_…"}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </AdminField>
              <AdminField label="Secret key (sk_…)">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  placeholder={data.payments.secret_key_hint || "sk_test_…"}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </AdminField>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void clearKeys()}
                  disabled={saving}
                  className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-muted hover:bg-paper disabled:opacity-50"
                >
                  Clear saved keys
                </button>
                <button
                  type="submit"
                  disabled={saving || (!publicKey.trim() && !secretKey.trim())}
                  className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save credentials"}
                </button>
              </div>
              <SettingsFeedback message={message} />
            </form>
          </AdminPanel>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* System Status                                                              */
/* ------------------------------------------------------------------------- */

function apiOrigin(): string {
  return API_CONFIG.baseUrl.replace(/\/api\/v1\/?$/, "");
}

function SystemPanel() {
  const { data, loading, error, reload } = usePlatformSettings();
  const refreshAll = useSession((state) => state.refreshAll);
  const sessionStatus = useSession((state) => state.status);
  const role = useSession((state) => state.role);
  const [health, setHealth] = useState<{
    ok: boolean;
    service: string;
    database: string;
    latencyMs: number;
  } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [backendTest, setBackendTest] = useState<SettingsMessage>(null);
  const [backendBusy, setBackendBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setHealthError(null);
    const started = performance.now();
    try {
      const res = await fetch(`${apiOrigin()}/health`);
      const body = (await res.json()) as { ok: boolean; service: string; database: string };
      setHealth({
        ok: Boolean(body.ok),
        service: body.service,
        database: body.database,
        latencyMs: Math.round(performance.now() - started),
      });
    } catch {
      setHealth(null);
      setHealthError("Could not reach the backend health endpoint.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    adminApi
      .aiStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, [checkHealth]);

  async function testBackend() {
    setBackendBusy(true);
    setBackendTest(null);
    try {
      const overview = await adminApi.overview();
      setBackendTest({
        ok: true,
        text: `Connected. ${overview.totalStudents} students, ${overview.activeSubscriptions} active subscriptions.`,
      });
    } catch (err) {
      setBackendTest({
        ok: false,
        text: readSettingsError(err, "Could not reach the backend. Check the API URL and try again."),
      });
    } finally {
      setBackendBusy(false);
    }
  }

  async function refreshData() {
    setBackendBusy(true);
    try {
      await refreshAll();
      setLastRefreshed(new Date().toLocaleString("en-NG"));
      setBackendTest({ ok: true, text: "Backend data refreshed." });
    } catch (err) {
      setBackendTest({
        ok: false,
        text: readSettingsError(err, "Could not refresh backend data."),
      });
    } finally {
      setBackendBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {loading && !data && <AdminLoading label="Loading system status…" />}
      {error && !data && <AdminError message={error} onRetry={() => void reload()} />}

      {data && (
        <>
          <AdminPanel
            title="Backend health"
            description="Live check of the FastAPI service and its database."
            actions={
              <button
                type="button"
                onClick={() => void checkHealth()}
                disabled={checking}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3.5", checking && "animate-spin")} aria-hidden />
                {checking ? "Checking…" : "Re-check"}
              </button>
            }
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Service">
                <span className="inline-flex items-center gap-2">
                  <Activity className="size-4 text-muted" aria-hidden />
                  {health?.service ?? (healthError ? "Unreachable" : "…")}
                </span>
              </AdminField>
              <AdminField label="Status">
                {healthError ? (
                  <span className="inline-flex items-center gap-1.5 text-red-600">
                    <XCircle className="size-4" aria-hidden />
                    {healthError}
                  </span>
                ) : health ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                      health.ok
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-red-50 text-red-700 border-red-100",
                    )}
                  >
                    {health.ok ? "Operational" : "Degraded"}
                  </span>
                ) : (
                  "…"
                )}
              </AdminField>
              <AdminField label="Database">{health?.database ?? "—"}</AdminField>
              <AdminField label="Response time">
                {health ? `${health.latencyMs} ms` : "—"}
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel title="AI service" description="Current Gemini configuration as reported by the server.">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="Gemini">
                <span className="inline-flex items-center gap-2">
                  <Cpu className="size-4 text-muted" aria-hidden />
                  {aiStatus ? aiStatus.model : "…"}
                </span>
              </AdminField>
              <AdminField label="Configuration">
                {aiStatus ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                      aiStatus.configured
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-red-50 text-red-700 border-red-100",
                    )}
                  >
                    {aiStatus.statusText}
                  </span>
                ) : (
                  "Unavailable"
                )}
              </AdminField>
              <AdminField label="Provider">{aiStatus?.provider ?? "—"}</AdminField>
              <AdminField label="Key hint">
                <span className="font-mono text-xs">{aiStatus?.keyHint || "—"}</span>
              </AdminField>
            </div>
            <div className="border-t border-line px-4 py-3 text-xs text-muted">
              <Link to="/admin/settings/ai" className="font-semibold text-primary hover:underline">
                Manage Gemini settings
              </Link>
            </div>
          </AdminPanel>

          <AdminPanel title="Connection" description="Backend API details and diagnostics.">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <AdminField label="API base URL">
                <span className="font-mono text-xs">{API_CONFIG.baseUrl}</span>
              </AdminField>
              <AdminField label="Request timeout">{API_CONFIG.timeoutMs / 1000}s</AdminField>
              <AdminField label="Environment">
                <span className="font-mono text-xs">{data.info.environment}</span>
              </AdminField>
              <AdminField label="Session status">{sessionStatus}</AdminField>
              <AdminField label="Role">{role ?? "—"}</AdminField>
              <AdminField label="Last refresh">{lastRefreshed ?? "Not requested"}</AdminField>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
              <button
                type="button"
                onClick={() => void testBackend()}
                disabled={backendBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50"
              >
                <Plug className={cn("size-4", backendBusy && "animate-pulse")} aria-hidden />
                {backendBusy ? "Working…" : "Test backend connection"}
              </button>
              <button
                type="button"
                onClick={() => void refreshData()}
                disabled={backendBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50"
              >
                <RefreshCw className={cn("size-4", backendBusy && "animate-spin")} aria-hidden />
                Refresh backend data
              </button>
              <Link
                to="/admin/audit"
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
              >
                View audit log
              </Link>
            </div>
            {backendTest && (
              <div className="border-t border-line p-4">
                <SettingsFeedback message={backendTest} />
              </div>
            )}
          </AdminPanel>

          <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              Settings changes are recorded in the{" "}
              <Link to="/admin/audit" className="font-semibold text-primary hover:underline">
                audit log
              </Link>
              . No destructive operations or data resets are available here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
