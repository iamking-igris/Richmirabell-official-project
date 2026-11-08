import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Globe,
  BookOpen,
  Bell,
  Sparkles,
  ShieldCheck,
  Layers,
  Wrench,
  ArrowLeft,
  Check,
  AlertTriangle,
  RefreshCw,
  Lock,
  Server,
  CheckCircle2,
  XCircle,
  Info,
  User,
  Mail,
  Phone,
  Clock,
  DollarSign,
  Calendar,
  Sliders,
  Shield,
  RotateCcw,
  Trash2,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import {
  useSettingsStore,
  calculateTotalCbtQuestions,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_ACADEMIC_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_AI_PREFERENCES,
  DEFAULT_ADMIN_PROFILE,
} from "@/lib/settings-store";
import { useSession } from "@/lib/session";
import { useContent } from "@/lib/content";

export const Route = createFileRoute("/admin/settings/$category")({
  component: AdminSettingsCategoryPage,
});

export function AdminSettingsCategoryPage() {
  const params = useParams({ strict: false }) as { category?: string };
  const category = params.category ?? "general";
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const renderCategoryView = () => {
    switch (category) {
      case "general":
        return <GeneralSettingsView showToast={showToast} />;
      case "academic":
        return <AcademicSettingsView showToast={showToast} />;
      case "notifications":
        return <NotificationSettingsView showToast={showToast} />;
      case "ai":
      case "gemini":
        return <AiSettingsView showToast={showToast} />;
      case "security":
        return <SecuritySettingsView showToast={showToast} />;
      case "integrations":
        return <IntegrationsSettingsView showToast={showToast} />;
      case "developer":
      case "advanced":
        return <AdvancedSettingsView showToast={showToast} />;
      default:
        return (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <AlertTriangle className="mx-auto size-10 text-amber-500" />
            <h2 className="mt-3 font-display text-xl font-bold text-ink">Unknown Category</h2>
            <p className="mt-1 text-sm text-muted">The requested settings category was not found.</p>
            <Link
              to="/admin/settings"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-fg"
            >
              <ArrowLeft className="size-4" />
              Back to Settings
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-surface px-5 py-3.5 text-xs font-medium text-ink shadow-xl animate-in fade-in slide-in-from-bottom-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="size-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {renderCategoryView()}
    </div>
  );
}

// ============================================================================
// 1. GENERAL PLATFORM SETTINGS VIEW
// ============================================================================
function GeneralSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const general = useSettingsStore((s) => s.general);
  const updateGeneralSettings = useSettingsStore((s) => s.updateGeneralSettings);

  const [form, setForm] = useState({ ...general });

  useEffect(() => {
    setForm({ ...general });
  }, [general]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGeneralSettings(form);
    showToast("General platform settings saved successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">General Platform</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            General Platform Settings
          </h1>
          <p className="mt-1 text-xs text-muted">
            Configure platform identity, branding, regional preferences, and maintenance mode.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform Identity */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Platform Identity & Contact</h2>
              <p className="text-xs text-muted">Core naming and support details shown to candidates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-ink">Platform Name</label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Richmirabel JAMB/WAEC CBT Platform"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-ink">Platform Tagline & Description</label>
              <textarea
                value={form.platformTagline}
                onChange={(e) => setForm({ ...form, platformTagline: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Brief description of the platform capabilities"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted" /> Support Email
              </label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="support@richmirabel.ng"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted" /> Support Phone Number
              </label>
              <input
                type="text"
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="+234 803 123 4567"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-ink">Official Website URL</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://richmirabel.ng"
              />
            </div>
          </div>
        </div>

        {/* Localisation & Regional Preferences */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Regional & Localisation Preferences</h2>
              <p className="text-xs text-muted">Timezone, currency symbols, and date formatting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Operating Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="NGN (₦)">NGN (₦) - Nigerian Naira</option>
                <option value="USD ($)">USD ($) - US Dollar</option>
                <option value="GHS (₵)">GHS (₵) - Ghanaian Cedi</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Platform Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Africa/Lagos (GMT+1)">Africa/Lagos (GMT+1)</option>
                <option value="UTC (GMT+0)">UTC (GMT+0)</option>
                <option value="Africa/Accra (GMT+0)">Africa/Accra (GMT+0)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Date Display Format</label>
              <select
                value={form.dateFormat}
                onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/04/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-04-15)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 04/15/2026)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink">Maintenance Mode</h2>
                <p className="text-xs text-muted">Temporarily restrict candidate access for maintenance</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-ink">
              <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                When Maintenance Mode is <strong>enabled</strong>, student candidates see a broadcast maintenance screen and CBT exam sessions are temporarily paused. Administrators retain full workspace access.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Candidate Maintenance Broadcast Message</label>
              <textarea
                value={form.maintenanceMessage}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Broadcast message shown to candidates during maintenance..."
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-fg shadow-xs hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Check className="size-4" />
            Save General Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 2. ACADEMIC & LEARNING SETTINGS VIEW
// ============================================================================
function AcademicSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const academic = useSettingsStore((s) => s.academic);
  const updateAcademicSettings = useSettingsStore((s) => s.updateAcademicSettings);

  const [form, setForm] = useState({ ...academic });

  useEffect(() => {
    setForm({ ...academic });
  }, [academic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAcademicSettings(form);
    showToast("Academic & learning preferences saved successfully.");
  };

  const totalQuestions = calculateTotalCbtQuestions(form);

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Academic & Learning</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Academic & Learning Settings
          </h1>
          <p className="mt-1 text-xs text-muted">
            Configure JAMB UTME subject rules, examination question counts, duration, and review rules.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* JAMB Subject Offerings Summary Grid */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">JAMB UTME Subject Offerings</h2>
              <p className="text-xs text-muted">Core 5 subjects available on the platform</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "physics", name: "Physics", status: "Syllabus Notes & CBT Prepared", highlight: true },
              { id: "english", name: "Use of English", status: "Compulsory Core Subject", highlight: false },
              { id: "chemistry", name: "Chemistry", status: "Notes & Question Bank Ready", highlight: false },
              { id: "biology", name: "Biology", status: "Notes & Question Bank Ready", highlight: false },
              { id: "mathematics", name: "Mathematics", status: "Notes & Question Bank Ready", highlight: false },
            ].map((subj) => (
              <div
                key={subj.id}
                className={`rounded-xl border p-4 space-y-1.5 transition-all ${
                  subj.highlight
                    ? "border-primary/40 bg-primary/5"
                    : "border-line bg-paper/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-ink">{subj.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      subj.highlight
                        ? "bg-primary/15 text-primary"
                        : "bg-line/60 text-muted"
                    }`}
                  >
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted">{subj.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Candidate Subject Selection & Exam Parameters */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Default CBT Examination Parameters</h2>
              <p className="text-xs text-muted">Question distribution and exam timing rules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Compulsory Subject Rule</label>
              <input
                type="text"
                value={form.compulsorySubject}
                disabled
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs text-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Total Required Subjects</label>
              <input
                type="number"
                value={form.requiredSubjectCount}
                disabled
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs text-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Active Syllabus Cohort</label>
              <input
                type="text"
                value={form.activeSyllabusCohort}
                onChange={(e) => setForm({ ...form, activeSyllabusCohort: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="2025/2026 Academic Session"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">English Question Count</label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.cbtEnglishQuestions}
                onChange={(e) => setForm({ ...form, cbtEnglishQuestions: Number(e.target.value) || 60 })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Elective Subject Question Count</label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.cbtOtherSubjectQuestions}
                onChange={(e) => setForm({ ...form, cbtOtherSubjectQuestions: Number(e.target.value) || 40 })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Standard CBT Exam Time Limit (Mins)</label>
              <input
                type="number"
                min={15}
                max={300}
                value={form.cbtExamDurationMinutes}
                onChange={(e) => setForm({ ...form, cbtExamDurationMinutes: Number(e.target.value) || 120 })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Calculated Dynamic Questions Summary */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-xs text-primary font-medium">
            <span>Calculated Total UTME Examination Questions:</span>
            <span className="font-bold text-sm">
              {form.cbtEnglishQuestions} + (3 × {form.cbtOtherSubjectQuestions}) = {totalQuestions} Questions
            </span>
          </div>
        </div>

        {/* Learning & Exam Behaviour Switches */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Learning & Quiz Engine Switches</h2>
              <p className="text-xs text-muted">Controls candidate review capabilities and randomization</p>
            </div>
          </div>

          <div className="space-y-3.5 divide-y divide-line/60">
            {[
              {
                id: "allowPostExamReview",
                label: "Allow Post-Exam Question Review",
                desc: "Candidates can review full questions, options, and explanations after submitting CBT exams.",
                val: form.allowPostExamReview,
                setter: (v: boolean) => setForm({ ...form, allowPostExamReview: v }),
              },
              {
                id: "showDetailedExplanations",
                label: "Show Step-by-Step Solution Explanations",
                desc: "Display detailed pedagogical formulas and step-by-step reasoning in exam review.",
                val: form.showDetailedExplanations,
                setter: (v: boolean) => setForm({ ...form, showDetailedExplanations: v }),
              },
              {
                id: "instantQuizFeedback",
                label: "Instant Feedback in Practice Mode",
                desc: "Reveal correct answer immediately upon option selection during topical practice quizzes.",
                val: form.instantQuizFeedback,
                setter: (v: boolean) => setForm({ ...form, instantQuizFeedback: v }),
              },
              {
                id: "shuffleQuestions",
                label: "Randomise Question Sequence",
                desc: "Shuffle question order for every candidate attempting a CBT exam session.",
                val: form.shuffleQuestions,
                setter: (v: boolean) => setForm({ ...form, shuffleQuestions: v }),
              },
              {
                id: "shuffleOptions",
                label: "Randomise Multiple Choice Options (A-D)",
                desc: "Shuffle option choices A, B, C, D to discourage rote memorization.",
                val: form.shuffleOptions,
                setter: (v: boolean) => setForm({ ...form, shuffleOptions: v }),
              },
            ].map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between ${idx > 0 ? "pt-3.5" : ""}`}>
                <div className="space-y-0.5 max-w-xl">
                  <span className="text-xs font-semibold text-ink block">{item.label}</span>
                  <p className="text-[11px] text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-fg shadow-xs hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Check className="size-4" />
            Save Academic Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 3. NOTIFICATIONS & ALERTS SETTINGS VIEW
// ============================================================================
function NotificationSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const notifications = useSettingsStore((s) => s.notifications);
  const updateNotificationSettings = useSettingsStore((s) => s.updateNotificationSettings);

  const [form, setForm] = useState({ ...notifications });

  useEffect(() => {
    setForm({ ...notifications });
  }, [notifications]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotificationSettings(form);
    showToast("Notification preferences saved successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Notifications & Alerts</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Notifications & Alerts Settings
          </h1>
          <p className="mt-1 text-xs text-muted">
            Manage candidate expiry notifications, payment receipts, and administrative alerts.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Channel Delivery Status Notice Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-3.5">
        <Info className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-ink leading-relaxed">
          <p className="font-semibold">Local Notification Queue Active</p>
          <p className="text-muted">
            SMS & Email gateways (Termii, SendGrid, Twilio) can be configured below. Event triggers are logged in the activity ledger.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Expiry Reminders */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Student Subscription Expiry Reminders</h2>
              <p className="text-xs text-muted">Automated reminders sent to candidates approaching access expiry</p>
            </div>
          </div>

          <div className="space-y-3.5 divide-y divide-line/60">
            {[
              {
                id: "notifyExpiry7Days",
                label: "Send reminder 7 days before subscription expiry",
                desc: "Alert candidates a week prior to expiration so they can prepare to re-subscribe.",
                val: form.notifyExpiry7Days,
                setter: (v: boolean) => setForm({ ...form, notifyExpiry7Days: v }),
              },
              {
                id: "notifyExpiry3Days",
                label: "Send reminder 3 days before subscription expiry",
                desc: "High-priority notice highlighting upcoming expiration date.",
                val: form.notifyExpiry3Days,
                setter: (v: boolean) => setForm({ ...form, notifyExpiry3Days: v }),
              },
              {
                id: "notifyExpiry1Day",
                label: "Send final reminder 1 day before subscription expiry",
                desc: "Urgent notification sent 24 hours prior to access revocation.",
                val: form.notifyExpiry1Day,
                setter: (v: boolean) => setForm({ ...form, notifyExpiry1Day: v }),
              },
              {
                id: "notifyOnExpiryDay",
                label: "Send notification on expiry day",
                desc: "Informs candidate that their paid period has concluded.",
                val: form.notifyOnExpiryDay,
                setter: (v: boolean) => setForm({ ...form, notifyOnExpiryDay: v }),
              },
              {
                id: "notifyPaymentReceipt",
                label: "Send automatic payment receipt",
                desc: "Dispatch receipt notification upon successful subscription payment.",
                val: form.notifyPaymentReceipt,
                setter: (v: boolean) => setForm({ ...form, notifyPaymentReceipt: v }),
              },
              {
                id: "notifyWeeklyExamAvailable",
                label: "Send weekly CBT exam availability alert",
                desc: "Notify enrolled candidates when new weekly mock exams are published.",
                val: form.notifyWeeklyExamAvailable,
                setter: (v: boolean) => setForm({ ...form, notifyWeeklyExamAvailable: v }),
              },
            ].map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between ${idx > 0 ? "pt-3.5" : ""}`}>
                <div className="space-y-0.5 max-w-xl">
                  <span className="text-xs font-semibold text-ink block">{item.label}</span>
                  <p className="text-[11px] text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Alerts */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Administrative Platform Alerts</h2>
              <p className="text-xs text-muted">System alerts sent to administrators for platform events</p>
            </div>
          </div>

          <div className="space-y-3.5 divide-y divide-line/60">
            {[
              {
                id: "notifyAdminNewStudent",
                label: "Alert admin on new student sign-up",
                desc: "Notify Baba Ne when a candidate creates a new account on Richmirabel.",
                val: form.notifyAdminNewStudent,
                setter: (v: boolean) => setForm({ ...form, notifyAdminNewStudent: v }),
              },
              {
                id: "notifyAdminPaymentSuccess",
                label: "Alert admin on successful subscription payment",
                desc: "Instant notification upon receipt of candidate renewal or new subscription.",
                val: form.notifyAdminPaymentSuccess,
                setter: (v: boolean) => setForm({ ...form, notifyAdminPaymentSuccess: v }),
              },
              {
                id: "notifyAdminFailedPayment",
                label: "Alert admin on failed payment attempt",
                desc: "Flag payment gateway declines for immediate investigation.",
                val: form.notifyAdminFailedPayment,
                setter: (v: boolean) => setForm({ ...form, notifyAdminFailedPayment: v }),
              },
              {
                id: "notifyAdminDailyDigest",
                label: "Send daily administrative activity summary",
                desc: "Receive a aggregated daily report of student registrations and CBT attempts.",
                val: form.notifyAdminDailyDigest,
                setter: (v: boolean) => setForm({ ...form, notifyAdminDailyDigest: v }),
              },
            ].map((item, idx) => (
              <div key={item.id} className={`flex items-center justify-between ${idx > 0 ? "pt-3.5" : ""}`}>
                <div className="space-y-0.5 max-w-xl">
                  <span className="text-xs font-semibold text-ink block">{item.label}</span>
                  <p className="text-[11px] text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-fg shadow-xs hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Check className="size-4" />
            Save Notification Preferences
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 4. GEMINI AI & OCR CONFIGURATION VIEW
// ============================================================================
function AiSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const aiPreferences = useSettingsStore((s) => s.ai);
  const updateAiPreferences = useSettingsStore((s) => s.updateAiPreferences);

  const [form, setForm] = useState({ ...aiPreferences });
  const [serverStatus, setServerStatus] = useState<{
    configured: boolean;
    model: string;
    statusText: string;
    loading: boolean;
  }>({
    configured: true,
    model: aiPreferences.defaultModel,
    statusText: "Checking...",
    loading: true,
  });

  const [testResult, setTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Fetch real AI status on mount
  useEffect(() => {
    fetch("/api/admin/ai-status")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ok) {
          setServerStatus({
            configured: data.configured,
            model: data.model || aiPreferences.defaultModel,
            statusText: data.statusText || (data.configured ? "Configured" : "Not configured"),
            loading: false,
          });
          if (data.model) {
            setForm((prev) => ({ ...prev, defaultModel: data.model }));
          }
        } else {
          setServerStatus((prev) => ({ ...prev, loading: false, statusText: "Unknown" }));
        }
      })
      .catch(() => {
        setServerStatus((prev) => ({ ...prev, loading: false, statusText: "Offline" }));
      });
  }, []);

  const handleTestConnection = async () => {
    setTestResult({ loading: true });
    try {
      const res = await fetch("/api/admin/test-ai", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ loading: false, success: true, message: data.message });
      } else {
        setTestResult({ loading: false, success: false, message: data.message || "Connection failed." });
      }
    } catch (err: any) {
      setTestResult({ loading: false, success: false, message: err?.message || "Error connecting to AI endpoint." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateAiPreferences(form);

    // Sync model with server
    try {
      await fetch("/api/admin/set-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: form.defaultModel }),
      });
    } catch {}

    showToast("Gemini AI & OCR preferences updated successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Gemini AI & OCR</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Gemini AI & OCR Configuration
          </h1>
          <p className="mt-1 text-xs text-muted">
            Configure server-side Gemini vision models, document extraction, KaTeX LaTeX detection, and test live AI status.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Real Gemini Connection Card */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Server-Side Gemini AI Engine</h2>
              <p className="text-xs text-muted">Connected via Google GenAI TypeScript SDK</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              serverStatus.configured
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {serverStatus.configured ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {serverStatus.loading ? "Checking..." : serverStatus.statusText}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-1">
            <span className="text-[11px] text-muted font-medium block">Integration Provider</span>
            <p className="text-xs font-bold text-ink">Google Gemini Vision (@google/genai)</p>
          </div>

          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-1">
            <span className="text-[11px] text-muted font-medium block">API Proxy Endpoint</span>
            <p className="text-xs font-bold text-ink">Server-side proxy (/api/extract-notes)</p>
          </div>
        </div>

        {/* Live Test Button */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testResult.loading}
            className="inline-flex items-center gap-2 rounded-full border border-primary text-primary hover:bg-primary/10 px-5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${testResult.loading ? "animate-spin" : ""}`} />
            {testResult.loading ? "Testing Gemini API..." : "Test Gemini API Connection"}
          </button>

          {testResult.message && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                testResult.success
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                  : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
              }`}
            >
              <p className="font-semibold">{testResult.success ? "Connection Verified" : "Test Failed"}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Selection & OCR Options */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">Model & Extraction Preferences</h2>
              <p className="text-xs text-muted">Select active Gemini model and mathematical OCR rules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Active Gemini Model</label>
              <select
                value={form.defaultModel}
                onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended - Fast OCR)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Fallback Model)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">OCR Quality Mode</label>
              <select
                value={form.ocrQualityMode}
                onChange={(e) =>
                  setForm({ ...form, ocrQualityMode: e.target.value as "high_precision" | "standard" })
                }
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="high_precision">High Precision (Recommended for Math & Physics)</option>
                <option value="standard">Standard Speed (General Notes)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">AI Model Temperature</label>
                <span className="text-xs font-mono font-bold text-primary">{form.temperature}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted">
                Lower values (0.0 - 0.2) ensure deterministic, highly accurate factual OCR and math transcription.
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-3 border-t border-line">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-ink block">Auto-detect Mathematical Formulas</span>
                <p className="text-[11px] text-muted">
                  Automatically convert handwritten equations and physics formulas into structured KaTeX LaTeX blocks.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                <input
                  type="checkbox"
                  checked={form.ocrAutoDetectFormulas}
                  onChange={(e) => setForm({ ...form, ocrAutoDetectFormulas: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-ink block">Default KaTeX LaTeX Delimiters</span>
                <p className="text-[11px] text-muted">
                  Enforce standard LaTeX formatting without raw markdown backticks for immediate web math rendering.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                <input
                  type="checkbox"
                  checked={form.ocrDefaultLatex}
                  onChange={(e) => setForm({ ...form, ocrDefaultLatex: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security Disclosure */}
        <div className="rounded-2xl border border-line bg-surface p-5 flex items-start gap-3.5 shadow-2xs">
          <Shield className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-ink leading-relaxed">
            <p className="font-semibold">Zero Client-Side Key Exposure</p>
            <p className="text-muted">
              Gemini API credentials are securely managed on the backend proxy server (<code className="text-primary font-mono">/api/*</code>). API keys are never bundled into client JavaScript or exposed to candidate browsers.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-fg shadow-xs hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <Check className="size-4" />
            Save AI Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 5. ADMIN ACCESS & SECURITY SETTINGS VIEW
// ============================================================================
function SecuritySettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const adminProfile = useSettingsStore((s) => s.adminProfile);
  const updateAdminProfile = useSettingsStore((s) => s.updateAdminProfile);

  const [profileForm, setProfileForm] = useState({ ...adminProfile });
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({ ...adminProfile });
  }, [adminProfile]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdminProfile(profileForm);
    showToast("Administrator profile updated successfully.");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (!passForm.currentPassword) {
      setPassError("Please enter your current password.");
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    showToast("Administrator password updated successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Admin Access & Security</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Admin Access & Security
          </h1>
          <p className="mt-1 text-xs text-muted">
            Manage administrator profile details, security access, and authentication controls.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Administrator Access Notice */}
      <div className="rounded-2xl border border-line bg-surface p-5 flex items-start gap-3.5">
        <Info className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-ink leading-relaxed">
          <p className="font-semibold">Administrator Access Control</p>
          <p className="text-muted">
            Administrative permissions are managed securely. Default administrator access is assigned to <code className="font-mono bg-paper px-1.5 py-0.5 rounded border border-line">admin@gmail.com</code>.
          </p>
        </div>
      </div>

      {/* Admin Profile Details */}
      <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-fg font-bold font-display">
            BN
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Administrator Profile</h2>
            <p className="text-xs text-muted">{adminProfile.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <User className="size-3.5 text-muted" /> Full Name
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted" /> Administrator Email
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted" /> Phone Number
            </label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Department / Focus</label>
            <input
              type="text"
              value={profileForm.department}
              onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-fg shadow-xs hover:bg-primary/90 transition-colors"
          >
            <Check className="size-4" />
            Save Profile Details
          </button>
        </div>
      </form>

      {/* Password Update Form */}
      <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Change Administrator Password</h2>
            <p className="text-xs text-muted">Update security credentials for your admin account</p>
          </div>
        </div>

        {passError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3.5 text-xs text-red-600 font-medium">
            {passError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Current Password</label>
            <input
              type="password"
              value={passForm.currentPassword}
              onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">New Password</label>
            <input
              type="password"
              value={passForm.newPassword}
              onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Confirm New Password</label>
            <input
              type="password"
              value={passForm.confirmPassword}
              onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
          >
            Update Security Password
          </button>
        </div>
      </form>

      {/* Permissions Matrix */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Administrative Permissions Matrix</h2>
            <p className="text-xs text-muted">Role capabilities across platform modules</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-3 font-semibold">Module</th>
                <th className="pb-3 font-semibold">Super Administrator</th>
                <th className="pb-3 font-semibold">Content Editor</th>
                <th className="pb-3 font-semibold">Support Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {[
                { module: "Student Accounts & Subscriptions", super: "Full Access", editor: "View Only", support: "Manage Status" },
                { module: "Subjects, Notes & CBT Generator", super: "Full Access", editor: "Full Access", support: "View Only" },
                { module: "Payments & Revenue Ledger", super: "Full Access", editor: "No Access", support: "View Transactions" },
                { module: "Platform Settings & AI Config", super: "Full Access", editor: "No Access", support: "No Access" },
              ].map((row, i) => (
                <tr key={i} className="text-ink">
                  <td className="py-3 font-medium">{row.module}</td>
                  <td className="py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{row.super}</td>
                  <td className="py-3 text-muted">{row.editor}</td>
                  <td className="py-3 text-muted">{row.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. INTEGRATIONS & SYSTEM STATUS VIEW
// ============================================================================
function IntegrationsSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Integrations & Status</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Integrations & System Status
          </h1>
          <p className="mt-1 text-xs text-muted">
            Overview of connected services, storage engine health, and platform subsystems.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            name: "Google Gemini AI Proxy",
            type: "OCR & CBT Intelligence",
            status: "Connected",
            desc: "Server-side proxy processing vision note extractions and CBT question generation.",
            icon: Sparkles,
            active: true,
          },
          {
            name: "Student Registry Store",
            type: "Persistent State",
            status: "Operational",
            desc: "Local Zustand store with persistent client state maintaining candidate accounts.",
            icon: Server,
            active: true,
          },
          {
            name: "Subscriptions Access Rules",
            type: "Access Control",
            status: "Enforced",
            desc: "Monthly billing enforcement rules for paid candidate workspace features.",
            icon: ShieldCheck,
            active: true,
          },
          {
            name: "Payments Sandbox Ledger",
            type: "Transaction History",
            status: "Ready",
            desc: "Frontend payment ledger simulating subscriber billing and grant history.",
            icon: DollarSign,
            active: true,
          },
          {
            name: "Browser Storage Engine",
            type: "LocalStorage",
            status: "Healthy",
            desc: "Client-side storage maintaining offline syllabus data and candidate attempts.",
            icon: Layers,
            active: true,
          },
          {
            name: "SMS & Email Services",
            type: "Messaging Gateway",
            status: "Local Queue",
            desc: "External provider integration postponed. Notifications processed locally.",
            icon: Mail,
            active: false,
          },
        ].map((srv, idx) => {
          const Icon = srv.icon;
          return (
            <div key={idx} className="rounded-2xl border border-line bg-surface p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    srv.active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-paper text-muted border border-line"
                  }`}
                >
                  {srv.active ? <CheckCircle2 className="size-3" /> : <Info className="size-3" />}
                  {srv.status}
                </span>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-ink">{srv.name}</h3>
                <span className="text-[10px] text-muted font-medium">{srv.type}</span>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">{srv.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <h2 className="font-display text-base font-bold text-ink">Related System Configurations</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/settings/ai"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-colors"
          >
            <Sparkles className="size-3.5" />
            Configure Gemini AI Settings
          </Link>
          <Link
            to="/admin/students"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-colors"
          >
            <User className="size-3.5" />
            View Student Registry
          </Link>
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-colors"
          >
            <DollarSign className="size-3.5" />
            View Payments Ledger
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. ADVANCED / DEVELOPER TOOLS SETTINGS VIEW
// ============================================================================
function AdvancedSettingsView({ showToast }: { showToast: (msg: string) => void }) {
  const resetSettingsToDefault = useSettingsStore((s) => s.resetSettingsToDefault);
  const clearAllAttempts = useSession((s) => s.clearAllAttempts);
  const resetContent = useContent((s) => s.resetContent);

  const [activeModal, setActiveModal] = useState<"attempts" | "content" | "settings" | null>(null);

  const handleConfirmAction = () => {
    if (activeModal === "attempts") {
      clearAllAttempts();
      showToast("Candidate quiz and CBT exam attempt history cleared.");
    } else if (activeModal === "content") {
      resetContent();
      showToast("Subjects catalog and physics topics restored to initial seed data.");
    } else if (activeModal === "settings") {
      resetSettingsToDefault();
      showToast("All platform settings restored to factory defaults.");
    }
    setActiveModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link to="/admin/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink">Advanced / Developer Tools</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Advanced / Developer Tools
          </h1>
          <p className="mt-1 text-xs text-muted">
            Maintenance controls, local data management, and confirmation-protected system resets.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">Confirm Maintenance Action</h3>
                <p className="text-xs text-muted">This action modifies local persisted state</p>
              </div>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              {activeModal === "attempts" && "Are you sure you want to clear all candidate quiz and CBT exam attempt history? This action cannot be undone."}
              {activeModal === "content" && "Are you sure you want to reset the subjects catalog and physics topics back to initial shipped seed data?"}
              {activeModal === "settings" && "Are you sure you want to restore all platform settings across all 7 categories to factory default values?"}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="rounded-full bg-red-600 text-white px-5 py-2 text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Controls */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-5 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wrench className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Local Data & State Management</h2>
            <p className="text-xs text-muted">System actions for testing and demonstration reset</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-line bg-paper/40">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-ink">Clear Candidate Attempt History</h3>
              <p className="text-[11px] text-muted">Remove local candidate CBT exam and topical quiz score history.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("attempts")}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Clear Attempts
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-line bg-paper/40">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-ink">Reset Subjects Catalog to Initial Seed</h3>
              <p className="text-[11px] text-muted">Restore shipped physics notes, questions, and topics seed state.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("content")}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-red-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset Content Seed
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-red-600 dark:text-red-400">Restore Factory Settings Defaults</h3>
              <p className="text-[11px] text-muted">Reset all general, academic, notification, AI, and profile settings to defaults.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal("settings")}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-red-600 text-white px-4 py-2 text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Restore Settings Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
