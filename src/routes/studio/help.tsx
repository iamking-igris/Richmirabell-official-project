import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  PenLine,
  BarChart3,
  User,
  Shield,
  CreditCard,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
export const Route = createFileRoute("/studio/help")({
  component: StudentHelpPage,
});

const SUPPORT_EMAIL = "support@richmirabel.ng";
const SUPPORT_PHONE = "+234 803 123 4567";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

const FAQ_DATA: FaqItem[] = [
  // Account & Profile
  {
    id: "account-1",
    category: "Account & Profile",
    question: "How do I update my profile?",
    answer: "Go to Account > Profile and exams, where you can update your full name, target examination pathway, and expected examination month.",
    keywords: ["profile", "name", "update", "account", "edit", "details"],
  },
  {
    id: "account-2",
    category: "Account & Profile",
    question: "How do I set my examination details?",
    answer: "In Profile and exams, select whether you are preparing for JAMB UTME, WAEC WASSCE, or both examinations simultaneously.",
    keywords: ["exam", "jamb", "waec", "details", "target", "month"],
  },
  {
    id: "account-3",
    category: "Account & Profile",
    question: "How do I change my JAMB subject combination?",
    answer: "On your Account page under JAMB subjects, click 'Change combination' to select your 3 elective science subjects alongside compulsory Use of English.",
    keywords: ["jamb", "combination", "subjects", "physics", "chemistry", "biology", "mathematics"],
  },
  {
    id: "account-4",
    category: "Account & Profile",
    question: "What should I do if I cannot access my account?",
    answer: "Your student profile is saved to your Richmirabel account. If you cannot sign in, use the 'Forgot password' link on the login screen to reset your password.",
    keywords: ["access", "login", "signin", "cannot", "lost", "recover"],
  },

  // Subjects & Learning
  {
    id: "learning-1",
    category: "Subjects & Learning",
    question: "How do I access my selected subjects?",
    answer: "Open your Dashboard or Subjects page to view all available science subjects: Use of English, Physics, Chemistry, Biology, and Mathematics.",
    keywords: ["subjects", "access", "physics", "chemistry", "biology", "english"],
  },
  {
    id: "learning-2",
    category: "Subjects & Learning",
    question: "How do I open a lesson?",
    answer: "Select any subject from your list, choose a main topic (such as Mechanics or Wave Motion), and click a subtopic to open its structured theory notes and diagrams.",
    keywords: ["lesson", "open", "notes", "theory", "topic", "subtopic", "diagram"],
  },
  {
    id: "learning-3",
    category: "Subjects & Learning",
    question: "How do topics and subtopics work?",
    answer: "Subjects follow the official JAMB/WAEC syllabus. Read a subtopic note completely before attempting the practice set for that specific topic.",
    keywords: ["topics", "subtopics", "syllabus", "structure", "order"],
  },
  {
    id: "learning-4",
    category: "Subjects & Learning",
    question: "Can I revisit previously studied lessons?",
    answer: "Yes, all published lesson notes remain open and readable at any time, even after your free trial period expires.",
    keywords: ["revisit", "reread", "previous", "notes", "trial", "access"],
  },

  // JAMB CBT
  {
    id: "cbt-1",
    category: "JAMB CBT",
    question: "How do I start a CBT examination?",
    answer: "Click 'Take CBT' from the main menu or Dashboard to launch a full 4-subject JAMB UTME hall simulation.",
    keywords: ["cbt", "start", "jamb", "exam", "simulation", "hall"],
  },
  {
    id: "cbt-2",
    category: "JAMB CBT",
    question: "How does the examination timer work?",
    answer: "The CBT timer counts down from 120 minutes (2 hours) for the full 180-question paper, matching official JAMB hall conditions.",
    keywords: ["timer", "time", "duration", "hours", "countdown", "minutes"],
  },
  {
    id: "cbt-3",
    category: "JAMB CBT",
    question: "Can I move between questions?",
    answer: "Yes, use the question navigation palette at the bottom of the screen to jump directly between questions and subjects during the exam.",
    keywords: ["move", "navigate", "palette", "jump", "switch", "questions"],
  },
  {
    id: "cbt-4",
    category: "JAMB CBT",
    question: "Where can I see my CBT results?",
    answer: "Upon submitting your paper, your overall UTME score (out of 400), subject breakdown, and AI diagnostic review are displayed immediately.",
    keywords: ["results", "score", "utme", "review", "diagnostic", "marks"],
  },

  // Progress
  {
    id: "progress-1",
    category: "Progress",
    question: "How is my progress recorded?",
    answer: "Your best score for each topic quiz and examination attempt is automatically recorded and saved to your Richmirabel account.",
    keywords: ["progress", "recorded", "saved", "scores", "device", "history"],
  },
  {
    id: "progress-2",
    category: "Progress",
    question: "Where can I see my performance?",
    answer: "Visit the 'Progress' tab in the navigation menu to view your topic completion percentages, average scores, and examination attempt logs.",
    keywords: ["performance", "progress", "mastery", "averages", "logs"],
  },
  {
    id: "progress-3",
    category: "Progress",
    question: "Can I review my previous attempts?",
    answer: "Yes! Click on any CBT or quiz entry in the Examination Attempts Log on your Progress page to open its full question-by-question review.",
    keywords: ["review", "previous", "attempts", "past", "log", "answers"],
  },

  // Subscriptions & Payments
  {
    id: "sub-1",
    category: "Subscriptions & Payments",
    question: "How do I check my access status?",
    answer: "Go to Account > Access or check the header status badge (e.g. 'Full access' or '48h free trial').",
    keywords: ["access", "status", "subscription", "trial", "plan"],
  },
  {
    id: "sub-2",
    category: "Subscriptions & Payments",
    question: "How does the free trial work?",
    answer: "You receive 48 hours (2 days) of complete access starting from onboarding. After 48 hours, lesson notes remain readable while practice tests require term access.",
    keywords: ["trial", "free", "hours", "days", "access", "notes"],
  },
  {
    id: "sub-3",
    category: "Subscriptions & Payments",
    question: "How do I renew my access?",
    answer: "Open Account > Access to view term subscription details (₦4,500 for term access). Students are responsible for subscribing to their own monthly access.",
    keywords: ["renew", "subscription", "term", "payment", "access", "cost"],
  },
  {
    id: "sub-4",
    category: "Subscriptions & Payments",
    question: "What should I do if a payment does not reflect?",
    answer: "Payment processing is handled securely. You can select your preferred subscription plan on the Access page to activate your term subscription.",
    keywords: ["payment", "issue", "reflect", "simulate", "grant", "problem"],
  },
];

export function StudentHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("account-1");

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return FAQ_DATA;

    return FAQ_DATA.filter((item) => {
      const qMatch = item.question.toLowerCase().includes(query);
      const aMatch = item.answer.toLowerCase().includes(query);
      const catMatch = item.category.toLowerCase().includes(query);
      const kwMatch = item.keywords.some((kw) => kw.toLowerCase().includes(query));
      return qMatch || aMatch || catMatch || kwMatch;
    });
  }, [searchTerm]);

  const categories = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const item of filteredFaqs) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [filteredFaqs]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 font-sans pb-16">
      {/* Header & Back Control */}
      <div className="space-y-4">
        <Link
          to="/studio/account"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to Account
        </Link>

        <div>
          <h1 className="font-display text-4xl text-ink">Help & Support</h1>
          <p className="mt-1.5 text-sm text-muted">
            Find answers to common questions and get help using Richmirabel.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search help topics (e.g. subjects, CBT, timer, trial)..."
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-11 pr-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* Useful Quick Links Cards */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">Quick Resources</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { to: "/studio/profile", label: "Profile & Exams", desc: "Update subjects & exam month", icon: User },
            { to: "/studio/guides", label: "Study Guides", desc: "Tips & subject strategies", icon: BookOpen },
            { to: "/studio/subjects", label: "Notes", desc: "Lessons & topic notes", icon: BookOpen },
            { to: "/studio/cbt", label: "JAMB CBT", desc: "Full hall CBT simulations", icon: PenLine },
            { to: "/studio/progress", label: "Scores & Logs", desc: "Track performance", icon: BarChart3 },
            { to: "/studio/plan", label: "Term Access", desc: "Trial and subscription plan", icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 hover:border-primary/50 hover:bg-paper transition-all shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-xs font-bold text-ink group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted">{item.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* FAQ Categories & Expandable Items */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-bold text-ink">Frequently Asked Questions</h2>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center space-y-2">
            <HelpCircle className="mx-auto size-8 text-muted opacity-60" />
            <h3 className="font-display text-base font-bold text-ink">No matching help topics</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              No results found matching "{searchTerm}". Try searching for terms like <code className="bg-paper px-1 py-0.5 rounded text-ink">cbt</code>, <code className="bg-paper px-1 py-0.5 rounded text-ink">trial</code>, <code className="bg-paper px-1 py-0.5 rounded text-ink">subjects</code>, or <code className="bg-paper px-1 py-0.5 rounded text-ink">scores</code>.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Reset search
            </button>
          </div>
        ) : (
          categories.map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
                {categoryName}
              </h3>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-2xs">
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div key={item.id} className="transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium text-ink hover:bg-paper/50"
                      >
                        <span className="text-sm">{item.question}</span>
                        <span className="text-muted shrink-0">
                          {isExpanded ? <ChevronUp className="size-4 text-primary" /> : <ChevronDown className="size-4" />}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 text-xs leading-relaxed text-muted font-sans border-t border-line/40 bg-paper/30 animate-in fade-in duration-150">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact Support Section */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="size-4.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">Need Direct Assistance?</h2>
            <p className="text-xs text-muted">Contact the Richmirabel academic support team</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-3.5">
            <Mail className="size-4 text-primary shrink-0" />
            <div>
              <span className="text-muted block text-[11px]">Academic Support Email</span>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-bold text-ink hover:text-primary transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 p-3.5">
            <Phone className="size-4 text-primary shrink-0" />
            <div>
              <span className="text-muted block text-[11px]">Support Helpline</span>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
                className="font-bold text-ink hover:text-primary transition-colors"
              >
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          Support inquiries are reviewed by the academic operations team during standard business hours (8:00 AM – 6:00 PM West Africa Time).
        </p>
      </div>
    </div>
  );
}
