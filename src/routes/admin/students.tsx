import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Edit3,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Archive,
  RefreshCw,
  ExternalLink,
  FileText,
  Check,
  X,
  Layers,
  Trophy,
  ArrowLeft,
  Activity,
  CreditCard,
  Sparkles,
} from "lucide-react";
import {
  useStudentStore,
  calculateStudentOverviewStats,
  filterAndSortStudents,
  ALL_AVAILABLE_JAMB_SUBJECTS,
  type StudentRecord,
  type StudentAccessPlan,
  type StudentAccountStatus,
  type StudentCbtAttempt,
} from "@/lib/student-store";
import { InlineMathText } from "@/components/NotePreviewRenderer";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/students")({ component: AdminStudentsCenter });

export function AdminStudentsCenter() {
  const students = useStudentStore((s) => s.students);
  const suspendStudent = useStudentStore((s) => s.suspendStudent);
  const restoreStudent = useStudentStore((s) => s.restoreStudent);
  const archiveStudent = useStudentStore((s) => s.archiveStudent);
  const unarchiveStudent = useStudentStore((s) => s.unarchiveStudent);
  const deleteStudent = useStudentStore((s) => s.deleteStudent);
  const updateStudentProfile = useStudentStore((s) => s.updateStudentProfile);

  // View state: null = Directory list, string = Student Profile ID
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Suspended" | "Trial" | "Paid" | "Manual" | "Expired" | "Archived"
  >("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "recently_active">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  function notify(msg: string) {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  }

  // Active student object if viewing profile
  const activeStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Profile Active Tab
  const [profileTab, setProfileTab] = useState<"overview" | "activity" | "cbt" | "account">("overview");

  // Activity tab filters inside student profile
  const [activityTypeFilter, setActivityTypeFilter] = useState<"all" | "quiz" | "waec">("all");
  const [activitySubjectFilter, setActivitySubjectFilter] = useState<string>("all");

  // Modal States
  const [suspendModalStudent, setSuspendModalStudent] = useState<StudentRecord | null>(null);
  const [restoreModalStudent, setRestoreModalStudent] = useState<StudentRecord | null>(null);
  const [archiveModalStudent, setArchiveModalStudent] = useState<StudentRecord | null>(null);
  const [editModalStudent, setEditModalStudent] = useState<StudentRecord | null>(null);
  const [inspectCbtAttempt, setInspectCbtAttempt] = useState<StudentCbtAttempt | null>(null);

  // Edit Form Fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  function handleOpenEditModal(student: StudentRecord) {
    setEditModalStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditPhone(student.phone || "");
    setEditSubjects([...student.jambSubjects]);
    setEditFormError(null);
  }

  function handleSaveProfileEdit() {
    if (!editModalStudent) return;
    const res = updateStudentProfile(editModalStudent.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      jambSubjects: editSubjects,
    });

    if (!res.success) {
      setEditFormError(res.error || "Failed to update profile.");
      return;
    }

    notify(`Student profile updated for ${editName.trim()}.`);
    setEditModalStudent(null);
  }

  function toggleEditSubject(subject: string) {
    if (subject.toLowerCase() === "english") return; // English is compulsory
    if (editSubjects.includes(subject)) {
      setEditSubjects(editSubjects.filter((s) => s !== subject));
    } else {
      if (editSubjects.length >= 4) {
        setEditFormError("JAMB allows a maximum of 4 subjects (including compulsory English).");
        return;
      }
      setEditFormError(null);
      setEditSubjects([...editSubjects, subject]);
    }
  }

  // Calculate Overview Statistics
  const overviewStats = useMemo(() => calculateStudentOverviewStats(students), [students]);

  // Filter & Sort for Directory
  const filteredStudents = useMemo(() => {
    return filterAndSortStudents(students, {
      query: searchQuery,
      filter: statusFilter,
      subject: subjectFilter,
      sortBy: sortBy,
    });
  }, [students, searchQuery, statusFilter, subjectFilter, sortBy]);

  // Pagination calculation
  const totalStudentsCount = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudentsCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Helper: Status badge rendering
  function renderAccountStatusBadge(status: StudentAccountStatus) {
    if (status === "Active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <span className="size-1.5 rounded-full bg-rose-600" />
        Suspended
      </span>
    );
  }

  // Helper: Access Plan badge rendering
  function renderAccessPlanBadge(plan: StudentAccessPlan) {
    switch (plan) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-purple-900 border border-purple-200">
            Paid Access
          </span>
        );
      case "Trial":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-900 border border-blue-200">
            Free Trial
          </span>
        );
      case "Manual":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-200">
            Manual Grant
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-stone-100 text-stone-700 border border-stone-200">
            Expired
          </span>
        );
      default:
        return null;
    }
  }

  // Initials generator
  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  // Avatar background colors based on ID hash
  function getAvatarBg(id: string) {
    const colors = [
      "bg-emerald-700 text-white",
      "bg-blue-700 text-white",
      "bg-amber-700 text-white",
      "bg-purple-700 text-white",
      "bg-[#1A4D2E] text-white",
      "bg-teal-700 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    return colors[hash % colors.length];
  }

  return (
    <div className="space-y-6 pb-20 font-sans text-stone-800">
      {/* Toast Save Notification */}
      {feedbackMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-stone-900 text-white px-5 py-3 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: HEADER & STATS OVERVIEW                                        */}
      {/* ========================================================================= */}
      {!selectedStudentId ? (
        <div className="space-y-6">
          {/* Dashboard Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-xs font-bold uppercase tracking-wider">
                  Administration
                </span>
                <span className="text-xs text-stone-500 font-sans">
                  Africa/Lagos (WAT)
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#2A2422] font-bold mt-2 tracking-tight">
                Student Management Centre
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
                Monitor student records, review CBT and WAEC examination history, inspect learning activity, and manage account credentials.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">
                Active Enrolment: <strong className="text-stone-900 font-bold">{overviewStats.total} candidates</strong>
              </span>
            </div>
          </div>

          {/* 6 Statistic Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Total Students
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-stone-900">
                  {overviewStats.total}
                </span>
                <span className="size-7 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                  <Users className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-medium block">
                Enrolled records
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Active Accounts
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-emerald-900">
                  {overviewStats.active}
                </span>
                <span className="size-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium block">
                {Math.round((overviewStats.active / Math.max(1, overviewStats.total)) * 100)}% of total
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Trial Access
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-blue-900">
                  {overviewStats.trial}
                </span>
                <span className="size-7 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                  <Clock className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-blue-700 font-medium block">
                48-hr evaluations
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Paid Students
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-purple-900">
                  {overviewStats.paid}
                </span>
                <span className="size-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                  <CreditCard className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-purple-700 font-medium block">
                Term & UTME plans
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Suspended
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-rose-900">
                  {overviewStats.suspended}
                </span>
                <span className="size-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                  <ShieldAlert className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-rose-700 font-medium block">
                Access restricted
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition-all space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Expired Plans
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-2xl font-bold text-amber-900">
                  {overviewStats.expired}
                </span>
                <span className="size-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                  <AlertTriangle className="size-3.5" />
                </span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium block">
                Awaiting renewal
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Breadcrumbs when viewing student profile */
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setSelectedStudentId(null);
                setProfileTab("overview");
              }}
              className="text-[#1A4D2E] hover:underline flex items-center gap-1 font-bold"
            >
              <ArrowLeft className="size-3.5" /> Students Directory
            </button>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900 font-bold font-serif text-sm">
              {activeStudent?.name} ({activeStudent?.studentIdNumber})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => activeStudent && handleOpenEditModal(activeStudent)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-stone-300 text-xs font-bold text-stone-800 hover:bg-stone-50"
            >
              <Edit3 className="size-3.5 text-stone-600" />
              <span>Edit Profile</span>
            </button>
            {activeStudent && activeStudent.status === "Active" ? (
              <button
                type="button"
                onClick={() => setSuspendModalStudent(activeStudent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-rose-300 bg-rose-50 text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                <ShieldAlert className="size-3.5 text-rose-700" />
                <span>Suspend Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => activeStudent && setRestoreModalStudent(activeStudent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <CheckCircle2 className="size-3.5 text-emerald-700" />
                <span>Restore Account</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MAIN DIRECTORY (WHEN NO STUDENT PROFILE IS ACTIVE)             */}
      {/* ========================================================================= */}
      {!selectedStudentId ? (
        <div className="space-y-4">
          {/* Search, Filter Pills & Controls Bar */}
          <div className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-5 shadow-xs space-y-4 max-w-full min-w-0">
            {/* Top row: Search and Selects */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-0">
                <Search className="size-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by student name, email, or student ID..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-10 py-2.5 text-xs font-medium placeholder:text-stone-400 focus:bg-white focus:border-[#1A4D2E] focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Subject & Sort Filters */}
              <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full sm:w-auto rounded-2xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 focus:border-[#1A4D2E] focus:outline-hidden"
                >
                  <option value="All">All Subjects</option>
                  {ALL_AVAILABLE_JAMB_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Sort By Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 w-full sm:w-auto rounded-2xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 focus:border-[#1A4D2E] focus:outline-hidden"
                >
                  <option value="newest">Sort: Newest Registration</option>
                  <option value="oldest">Sort: Oldest Registration</option>
                  <option value="name_asc">Sort: Name A–Z</option>
                  <option value="name_desc">Sort: Name Z–A</option>
                  <option value="recently_active">Sort: Recently Active</option>
                </select>
              </div>
            </div>

            {/* Filter Pills Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { id: "All", label: "All Students", count: overviewStats.total },
                  { id: "Active", label: "Active", count: overviewStats.active },
                  { id: "Suspended", label: "Suspended", count: overviewStats.suspended },
                  { id: "Trial", label: "Trial", count: overviewStats.trial },
                  { id: "Paid", label: "Paid", count: overviewStats.paid },
                  { id: "Manual", label: "Manual", count: overviewStats.manual },
                  { id: "Expired", label: "Expired", count: overviewStats.expired },
                  { id: "Archived", label: "Archived", count: students.filter((s) => s.isArchived).length },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                      isActive
                        ? "bg-[#1A4D2E] text-white shadow-xs"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200/80"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "size-4 rounded-full text-[10px] flex items-center justify-center font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Table */}
          {filteredStudents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-12 text-center space-y-3">
              <Users className="size-10 text-stone-400 mx-auto opacity-70" />
              <h3 className="font-serif text-lg font-bold text-stone-800">
                No Matching Students Found
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto font-sans leading-relaxed">
                {searchQuery
                  ? `No student records match "${searchQuery}". Try searching for another name, email or student ID.`
                  : "No students currently match the selected filter criteria."}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("All");
                    setSubjectFilter("All");
                    setPage(1);
                  }}
                  className="px-4 py-2 rounded-full border border-stone-300 bg-white text-xs font-bold text-stone-800 hover:bg-stone-50"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-xs">
              <table className="w-full min-w-[840px] text-left text-xs">
                <thead className="border-b border-stone-200 bg-stone-50/80 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Selected Subjects</th>
                    <th className="px-4 py-3.5">Access Plan</th>
                    <th className="px-4 py-3.5">Account Status</th>
                    <th className="px-4 py-3.5">Registered</th>
                    <th className="px-4 py-3.5">Last Active</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {paginatedStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Column 1: Student Identity */}
                      <td className="px-5 py-4 font-semibold text-stone-900">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-2xl font-serif text-xs font-bold shrink-0 shadow-2xs",
                              getAvatarBg(st.id)
                            )}
                          >
                            {getInitials(st.name)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(st.id);
                                setProfileTab("overview");
                              }}
                              className="font-serif text-sm font-bold text-stone-900 hover:text-[#1A4D2E] hover:underline text-left block"
                            >
                              {st.name}
                            </button>
                            <span className="text-[11px] text-stone-500 font-normal font-sans block">
                              {st.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Student ID */}
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 rounded-md bg-stone-100 text-stone-800 font-mono text-[11px] font-bold">
                          {st.studentIdNumber}
                        </span>
                      </td>

                      {/* Column 3: Selected Subjects */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                          {st.jambSubjects.map((sub) => {
                            const isEnglish = sub.toLowerCase() === "english";
                            return (
                              <span
                                key={sub}
                                className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                                  isEnglish
                                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold"
                                    : "bg-stone-100 text-stone-700"
                                )}
                                title={isEnglish ? "Compulsory JAMB Subject" : undefined}
                              >
                                {sub}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Column 4: Access Plan */}
                      <td className="px-4 py-4">
                        {renderAccessPlanBadge(st.accessPlan)}
                      </td>

                      {/* Column 5: Account Status */}
                      <td className="px-4 py-4">
                        {renderAccountStatusBadge(st.status)}
                      </td>

                      {/* Column 6: Registration Date */}
                      <td className="px-4 py-4 text-stone-600 text-[11px]">
                        {st.registeredDate}
                      </td>

                      {/* Column 7: Last Active */}
                      <td className="px-4 py-4 text-stone-600 text-[11px]">
                        {st.lastActive}
                      </td>

                      {/* Column 8: Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(st.id);
                              setProfileTab("overview");
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] transition-colors shadow-2xs"
                          >
                            View Profile
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(st)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                            title="Edit profile"
                          >
                            <Edit3 className="size-3.5" />
                          </button>

                          {st.status === "Active" ? (
                            <button
                              type="button"
                              onClick={() => setSuspendModalStudent(st)}
                              className="p-1.5 text-stone-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                              title="Suspend student account"
                            >
                              <ShieldAlert className="size-3.5 text-stone-500 hover:text-rose-700" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRestoreModalStudent(st)}
                              className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                              title="Restore student account"
                            >
                              <CheckCircle2 className="size-3.5 text-emerald-700" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setArchiveModalStudent(st)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                            title={st.isArchived ? "Unarchive student" : "Archive student"}
                          >
                            <Archive className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 px-5 py-3.5 bg-stone-50/50 text-xs text-stone-500 font-sans">
                <div>
                  Showing{" "}
                  <strong>
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalStudentsCount)}
                  </strong>{" "}
                  of <strong>{totalStudentsCount}</strong> students
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </button>
                  <span className="text-xs font-bold text-stone-800 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* SECTION 3: DEDICATED STUDENT PROFILE VIEW                                 */
        /* ========================================================================= */
        activeStudent && (
          <div className="space-y-6">
            {/* Profile Overview Card Header */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-stone-100 pb-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-16 items-center justify-center rounded-3xl font-serif text-xl font-bold shrink-0 shadow-xs",
                      getAvatarBg(activeStudent.id)
                    )}
                  >
                    {getInitials(activeStudent.name)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-bold text-stone-900">
                        {activeStudent.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono text-xs font-bold">
                        {activeStudent.studentIdNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 font-sans">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-stone-400" />
                        {activeStudent.email}
                      </span>
                      {activeStudent.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5 text-stone-400" />
                          {activeStudent.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-stone-400" />
                        Registered {activeStudent.registeredDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Plan Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {renderAccountStatusBadge(activeStudent.status)}
                  {renderAccessPlanBadge(activeStudent.accessPlan)}
                </div>
              </div>

              {/* 4 Summary Metrics Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    CBT Average
                  </span>
                  <div className="font-serif text-xl font-bold text-[#1A4D2E]">
                    {activeStudent.cbtAttempts.length > 0
                      ? `${Math.round(
                          activeStudent.cbtAttempts.reduce((acc, c) => acc + c.utmeScore, 0) /
                            activeStudent.cbtAttempts.length
                        )} / 400`
                      : "No CBT Yet"}
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    {activeStudent.cbtAttempts.length} examinations recorded
                  </span>
                </div>

                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    Quizzes Completed
                  </span>
                  <div className="font-serif text-xl font-bold text-stone-900">
                    {activeStudent.quizAttempts.length}
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    {activeStudent.quizAttempts.length > 0
                      ? `${Math.round(
                          activeStudent.quizAttempts.reduce((acc, q) => acc + q.percentage, 0) /
                            activeStudent.quizAttempts.length
                        )}% avg accuracy`
                      : "Zero attempts"}
                  </span>
                </div>

                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    WAEC Practice
                  </span>
                  <div className="font-serif text-xl font-bold text-stone-900">
                    {activeStudent.waecAttempts.length} Papers
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    Past paper series
                  </span>
                </div>

                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    Study Days & Topics
                  </span>
                  <div className="font-serif text-xl font-bold text-stone-900">
                    {activeStudent.lessonsCompletedCount} Topics
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans block">
                    {activeStudent.studyDaysCount} active study days
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setProfileTab("overview")}
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap",
                  profileTab === "overview"
                    ? "bg-[#1A4D2E] text-white shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                <BookOpen className="size-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab("activity")}
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap",
                  profileTab === "activity"
                    ? "bg-[#1A4D2E] text-white shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                <Activity className="size-3.5" />
                <span>Learning Activity ({activeStudent.quizAttempts.length + activeStudent.waecAttempts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab("cbt")}
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap",
                  profileTab === "cbt"
                    ? "bg-[#1A4D2E] text-white shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                <Trophy className="size-3.5" />
                <span>CBT & Examinations ({activeStudent.cbtAttempts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab("account")}
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap",
                  profileTab === "account"
                    ? "bg-[#1A4D2E] text-white shadow-xs font-bold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                <CreditCard className="size-3.5" />
                <span>Account & Access Details</span>
              </button>
            </div>

            {/* ===================================================================== */}
            {/* PROFILE TAB 1: OVERVIEW                                               */}
            {/* ===================================================================== */}
            {profileTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Academic Profile & Subject Targets */}
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-4 text-[#1A4D2E]" />
                      <h3 className="font-serif text-base font-bold text-stone-900">
                        Selected JAMB Subject Pool
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-stone-500">
                      4 Subjects Required
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeStudent.jambSubjects.map((sub, idx) => {
                      const isEnglish = sub.toLowerCase() === "english";
                      return (
                        <div
                          key={sub}
                          className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 bg-stone-50/60 text-xs font-sans"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-6 items-center justify-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-800">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-stone-900">
                              {sub}
                            </span>
                            {isEnglish && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[9px] font-bold uppercase tracking-wider">
                                Compulsory
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-stone-500">
                            {isEnglish ? "60 Questions Target" : "40 Questions Target"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Latest CBT Highlight */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider text-[10px]">
                        Latest CBT Examination Performance
                      </span>
                    </div>

                    {activeStudent.cbtAttempts.length > 0 ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 text-xs">
                            {activeStudent.cbtAttempts[0].examName}
                          </span>
                          <span className="text-xs font-bold text-[#1A4D2E] bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                            {activeStudent.cbtAttempts[0].utmeScore} / 400 UTME
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 font-sans">
                          Completed on {activeStudent.cbtAttempts[0].dateAttempted} · Duration: {activeStudent.cbtAttempts[0].durationMinutes} mins · Accuracy: {activeStudent.cbtAttempts[0].percentage}%
                        </p>
                        <button
                          type="button"
                          onClick={() => setInspectCbtAttempt(activeStudent.cbtAttempts[0])}
                          className="text-xs font-bold text-[#1A4D2E] hover:underline inline-flex items-center gap-1 pt-1"
                        >
                          Inspect full score breakdown & answers →
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-500">
                        Candidate has not sat for any weekly CBT examination yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Access & Subscription Information */}
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-[#1A4D2E]" />
                      <h3 className="font-serif text-base font-bold text-stone-900">
                        Access & Subscription Profile
                      </h3>
                    </div>
                    {renderAccessPlanBadge(activeStudent.accessPlan)}
                  </div>

                  <dl className="space-y-3 text-xs font-sans">
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Subscription Plan</dt>
                      <dd className="font-bold text-stone-900">{activeStudent.subscriptionDetails.planName}</dd>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Account Access State</dt>
                      <dd>{renderAccountStatusBadge(activeStudent.status)}</dd>
                    </div>

                    {activeStudent.subscriptionDetails.expiryDate && (
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <dt className="text-stone-500 font-medium">Expiration Date</dt>
                        <dd className="font-semibold text-stone-800">
                          {new Date(activeStudent.subscriptionDetails.expiryDate).toLocaleDateString()}
                        </dd>
                      </div>
                    )}

                    {activeStudent.subscriptionDetails.trialEndDate && (
                      <div className="flex justify-between py-1 border-b border-stone-100">
                        <dt className="text-stone-500 font-medium">Trial Window Ends</dt>
                        <dd className="font-semibold text-blue-900">
                          {new Date(activeStudent.subscriptionDetails.trialEndDate).toLocaleDateString()}
                        </dd>
                      </div>
                    )}

                    {activeStudent.subscriptionDetails.manualGrantReason && (
                      <div className="py-2 border-b border-stone-100 space-y-1">
                        <dt className="text-stone-500 font-medium">Manual Grant Authorization</dt>
                        <dd className="font-medium text-stone-800 bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[11px]">
                          {activeStudent.subscriptionDetails.manualGrantReason}
                        </dd>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <dt className="text-stone-500 font-medium">Last Login & Activity</dt>
                      <dd className="font-bold text-stone-900">{activeStudent.lastActive}</dd>
                    </div>
                  </dl>

                  {/* Quick Action Links to Billing */}
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-2 text-xs font-semibold">
                    <Link
                      to="/admin/subscriptions"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100 text-xs font-bold"
                    >
                      <ExternalLink className="size-3 text-stone-500" />
                      <span>Subscriptions & Pricing</span>
                    </Link>
                    <Link
                      to="/admin/payments"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100 text-xs font-bold"
                    >
                      <ExternalLink className="size-3 text-stone-500" />
                      <span>Payments & Revenue</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* PROFILE TAB 2: LEARNING ACTIVITY                                      */}
            {/* ===================================================================== */}
            {profileTab === "activity" && (
              <div className="space-y-4">
                {/* Activity Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
                      Filter Activity:
                    </span>
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => setActivityTypeFilter(e.target.value as any)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 font-semibold text-stone-800"
                    >
                      <option value="all">All Learning Activities</option>
                      <option value="quiz">Topic Quizzes Only</option>
                      <option value="waec">WAEC Practice Only</option>
                    </select>

                    <select
                      value={activitySubjectFilter}
                      onChange={(e) => setActivitySubjectFilter(e.target.value)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 font-semibold text-stone-800"
                    >
                      <option value="all">All Subjects</option>
                      {activeStudent.jambSubjects.map((sub) => (
                        <option key={sub} value={sub.toLowerCase()}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-stone-500 text-[11px]">
                    Total recorded attempts: {activeStudent.quizAttempts.length + activeStudent.waecAttempts.length}
                  </span>
                </div>

                {/* Activity List */}
                {(() => {
                  const filteredQuizzes = activeStudent.quizAttempts.filter((q) => {
                    if (activityTypeFilter === "waec") return false;
                    if (activitySubjectFilter !== "all" && q.subject.toLowerCase() !== activitySubjectFilter) return false;
                    return true;
                  });

                  const filteredWaec = activeStudent.waecAttempts.filter((w) => {
                    if (activityTypeFilter === "quiz") return false;
                    if (activitySubjectFilter !== "all" && w.subject.toLowerCase() !== activitySubjectFilter) return false;
                    return true;
                  });

                  const hasActivity = filteredQuizzes.length > 0 || filteredWaec.length > 0;

                  if (!hasActivity) {
                    return (
                      <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-12 text-center space-y-2">
                        <BookOpen className="size-8 text-stone-400 mx-auto opacity-70" />
                        <h4 className="font-serif text-base font-bold text-stone-800">
                          No learning activity recorded yet.
                        </h4>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto font-sans leading-relaxed">
                          This student has not attempted any quizzes or past WAEC papers matching the selected filter.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {/* Topic Quizzes */}
                      {filteredQuizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          className="rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-[#1A4D2E] text-[10px] font-bold uppercase">
                                Quiz
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                                {quiz.subject}
                              </span>
                              <span className="font-serif text-sm font-bold text-stone-900">
                                {quiz.topic}
                              </span>
                            </div>
                            {quiz.subtopic && (
                              <p className="text-stone-500 text-[11px] font-sans pl-1">
                                Subtopic: {quiz.subtopic}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-stone-500 text-[11px]">
                              {quiz.dateAttempted}
                            </span>
                            <div className="text-right">
                              <div className="font-serif font-bold text-sm text-stone-900">
                                {quiz.score} / {quiz.total} ({quiz.percentage}%)
                              </div>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Completed
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* WAEC Attempts */}
                      {filteredWaec.map((waec) => (
                        <div
                          key={waec.id}
                          className="rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[10px] font-bold uppercase">
                                WAEC Practice
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                                {waec.subject}
                              </span>
                              <span className="font-serif text-sm font-bold text-stone-900">
                                {waec.year} Standard Paper
                              </span>
                            </div>
                            <p className="text-stone-500 text-[11px] font-sans pl-1">
                              {waec.questionsAttempted} Questions attempted
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-stone-500 text-[11px]">
                              {waec.dateCompleted}
                            </span>
                            <div className="text-right">
                              <div className="font-serif font-bold text-sm text-blue-950">
                                {waec.score} / {waec.questionsAttempted} ({waec.percentage}%)
                              </div>
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                                Verified Attempt
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ===================================================================== */}
            {/* PROFILE TAB 3: CBT & EXAMINATION HISTORY                              */}
            {/* ===================================================================== */}
            {profileTab === "cbt" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-xs font-sans flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-800">
                      Standard UTME Examination History
                    </h4>
                    <p className="text-stone-500 text-[11px]">
                      Records of 4-subject UTME Weekly CBT and Full Mock Examination papers with 400-point scoring.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white text-stone-900 border border-stone-200 text-xs font-bold shadow-2xs">
                    {activeStudent.cbtAttempts.length} Total Papers Sat
                  </span>
                </div>

                {activeStudent.cbtAttempts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-12 text-center space-y-2">
                    <Trophy className="size-8 text-stone-400 mx-auto opacity-70" />
                    <h4 className="font-serif text-base font-bold text-stone-800">
                      No CBT examination attempts recorded yet.
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto font-sans leading-relaxed">
                      When the candidate completes a Weekly CBT paper or Full Simulation Mock from the student portal, the results and score breakdown will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activeStudent.cbtAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 hover:border-stone-300 transition-all space-y-4 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
                                {attempt.examType === "full_jamb_mock" ? "Full JAMB Mock" : "Weekly JAMB CBT"}
                              </span>
                              {attempt.weekOrPeriod && (
                                <span className="text-xs text-stone-500 font-medium font-sans">
                                  {attempt.weekOrPeriod}
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif text-lg font-bold text-stone-900">
                              {attempt.examName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-serif text-xl font-bold text-[#1A4D2E]">
                                {attempt.utmeScore} / 400 UTME
                              </div>
                              <span className="text-[11px] text-stone-500">
                                Raw: {attempt.correctCount} / {attempt.totalQuestions} ({attempt.percentage}%)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setInspectCbtAttempt(attempt)}
                              className="px-4 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25] transition-colors shadow-2xs"
                            >
                              Inspect Results
                            </button>
                          </div>
                        </div>

                        {/* Subject Breakdown Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
                          {Object.entries(attempt.subjectScores).map(([subj, data]) => (
                            <div
                              key={subj}
                              className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between"
                            >
                              <span className="font-semibold text-stone-800">{subj}</span>
                              <span className="font-bold text-[#1A4D2E]">
                                {data.score}/{data.total} ({data.percentage}%)
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-500 font-sans pt-1">
                          <span>Date Sat: {attempt.dateAttempted} ({attempt.startTime} – {attempt.submissionTime})</span>
                          <span>Duration: {attempt.durationMinutes} mins · Status: <strong>{attempt.status}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* PROFILE TAB 4: ACCOUNT & ACCESS DETAILS                               */}
            {/* ===================================================================== */}
            {profileTab === "account" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Personal & Enrollment Credentials
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(activeStudent)}
                      className="text-xs font-bold text-[#1A4D2E] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="size-3" /> Edit Info
                    </button>
                  </div>

                  <dl className="space-y-3 text-xs font-sans">
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Full Name</dt>
                      <dd className="font-bold text-stone-900">{activeStudent.name}</dd>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Email Address</dt>
                      <dd className="font-medium text-stone-900">{activeStudent.email}</dd>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Phone Number</dt>
                      <dd className="font-medium text-stone-900">{activeStudent.phone || "Not provided"}</dd>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Student ID Number</dt>
                      <dd className="font-mono font-bold text-stone-900">{activeStudent.studentIdNumber}</dd>
                    </div>

                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <dt className="text-stone-500 font-medium">Registration Date</dt>
                      <dd className="font-medium text-stone-900">{activeStudent.registeredDate}</dd>
                    </div>

                    <div className="flex justify-between py-1">
                      <dt className="text-stone-500 font-medium">Last Session</dt>
                      <dd className="font-medium text-stone-900">{activeStudent.lastActive}</dd>
                    </div>
                  </dl>
                </div>

                {/* Account Security & Management Controls */}
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Account Status & Actions
                    </h3>
                    {renderAccountStatusBadge(activeStudent.status)}
                  </div>

                  <p className="text-xs text-stone-600 font-sans leading-relaxed">
                    Account status governs student portal sign-in and authorization. Suspending an account temporarily revokes platform access while preserving all historical examination scores and records.
                  </p>

                  <div className="space-y-3 pt-2">
                    {activeStudent.status === "Active" ? (
                      <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                          <ShieldAlert className="size-4 text-rose-600" />
                          <span>Suspend Candidate Access</span>
                        </div>
                        <p className="text-[11px] text-rose-800 font-sans">
                          Temporarily block this student from sitting examinations or accessing lessons.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSuspendModalStudent(activeStudent)}
                          className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                        >
                          Suspend Account
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span>Restore Candidate Access</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-sans">
                          Restore this account to Active state under their current subscription tier.
                        </p>
                        <button
                          type="button"
                          onClick={() => setRestoreModalStudent(activeStudent)}
                          className="px-4 py-2 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
                        >
                          Restore to Active
                        </button>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                        <Archive className="size-4 text-stone-600" />
                        <span>Archive Student Record</span>
                      </div>
                      <p className="text-[11px] text-stone-600 font-sans">
                        Hides the student from the active directory while retaining all historical examination attempts and audit trails.
                      </p>
                      <button
                        type="button"
                        onClick={() => setArchiveModalStudent(activeStudent)}
                        className="px-4 py-2 rounded-full border border-stone-300 text-stone-800 text-xs font-bold hover:bg-white"
                      >
                        {activeStudent.isArchived ? "Unarchive Student" : "Archive Candidate"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUSPEND CONFIRMATION DIALOG                                      */}
      {/* ========================================================================= */}
      {suspendModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="size-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="size-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Confirm Account Suspension
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Are you sure you want to suspend{" "}
                <strong className="text-stone-900">{suspendModalStudent.name}</strong> (
                {suspendModalStudent.studentIdNumber})?
              </p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-rose-900 font-sans space-y-1">
              <span className="font-bold block">Effect of Suspension:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                <li>Candidate cannot sign in or sit CBT examinations.</li>
                <li>All historical examination attempts and scores are retained.</li>
                <li>Subscription plan remains unchanged.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalStudent(null)}
                className="flex-1 min-h-10 rounded-full border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  suspendStudent(suspendModalStudent.id);
                  notify(`Account suspended for ${suspendModalStudent.name}.`);
                  setSuspendModalStudent(null);
                }}
                className="flex-1 min-h-10 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESTORE CONFIRMATION DIALOG                                      */}
      {/* ========================================================================= */}
      {restoreModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="size-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6 text-[#1A4D2E]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Restore Student Account
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Restore <strong className="text-stone-900">{restoreModalStudent.name}</strong> to Active status?
              </p>
            </div>

            <p className="text-xs text-stone-600 font-sans text-center">
              The student will regain access to platform features under their current access tier (
              <strong>{restoreModalStudent.accessPlan}</strong>).
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalStudent(null)}
                className="flex-1 min-h-10 rounded-full border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  restoreStudent(restoreModalStudent.id);
                  notify(`Account restored to Active for ${restoreModalStudent.name}.`);
                  setRestoreModalStudent(null);
                }}
                className="flex-1 min-h-10 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                Yes, Restore Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PROFILE DIALOG                                              */}
      {/* ========================================================================= */}
      {editModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
          <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="size-5 text-[#1A4D2E]" />
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Edit Student Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalStudent(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            {editFormError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                <span>{editFormError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="font-bold text-stone-700 uppercase text-[10px] block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Student Full Name"
                  className="mt-1 w-full rounded-xl border border-stone-200 p-2.5 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase text-[10px] block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="mt-1 w-full rounded-xl border border-stone-200 p-2.5 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase text-[10px] block">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+234 802 345 6789"
                  className="mt-1 w-full rounded-xl border border-stone-200 p-2.5 text-xs font-medium focus:border-[#1A4D2E] focus:outline-hidden"
                />
              </div>

              {/* JAMB 4-Subject Selector */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700 uppercase text-[10px] block">
                    Selected JAMB Subjects (Exactly 4 Required)
                  </label>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md",
                    editSubjects.length === 4
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  )}>
                    {editSubjects.length} / 4 Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {ALL_AVAILABLE_JAMB_SUBJECTS.map((subj) => {
                    const isEnglish = subj.toLowerCase() === "english";
                    const isSelected = editSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleEditSubject(subj)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all",
                          isEnglish
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 cursor-default font-bold"
                            : isSelected
                            ? "border-[#1A4D2E] bg-[#1A4D2E] text-white shadow-2xs font-bold"
                            : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300"
                        )}
                      >
                        <span>{subj}</span>
                        {isEnglish ? (
                          <span className="text-[9px] uppercase font-bold text-emerald-700">Req</span>
                        ) : isSelected ? (
                          <Check className="size-3 text-white" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-500 italic">
                  * English Language is strictly compulsory for all JAMB candidates.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEditModalStudent(null)}
                className="px-4 py-2 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfileEdit}
                className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ARCHIVE CONFIRMATION DIALOG                                      */}
      {/* ========================================================================= */}
      {archiveModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="size-11 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center mx-auto">
              <Archive className="size-6 text-stone-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {archiveModalStudent.isArchived ? "Unarchive Student" : "Archive Student"}
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                {archiveModalStudent.isArchived
                  ? `Restore ${archiveModalStudent.name} back to the active student directory?`
                  : `Are you sure you want to archive ${archiveModalStudent.name}? They will be hidden from the active directory while preserving all historical examination records.`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalStudent(null)}
                className="flex-1 min-h-10 rounded-full border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (archiveModalStudent.isArchived) {
                    unarchiveStudent(archiveModalStudent.id);
                    notify(`Unarchived ${archiveModalStudent.name}.`);
                  } else {
                    archiveStudent(archiveModalStudent.id);
                    notify(`Archived ${archiveModalStudent.name}.`);
                  }
                  setArchiveModalStudent(null);
                }}
                className="flex-1 min-h-10 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                {archiveModalStudent.isArchived ? "Confirm Unarchive" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DETAILED CBT ATTEMPT RESULT INSPECTION                           */}
      {/* ========================================================================= */}
      {inspectCbtAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
          <div className="w-full max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1A4D2E] font-bold text-[10px] uppercase">
                    Official CBT Result
                  </span>
                  <span className="text-xs text-stone-500 font-sans">
                    Sat on {inspectCbtAttempt.dateAttempted}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                  {inspectCbtAttempt.examName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectCbtAttempt(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Overall Score Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  UTME Score
                </span>
                <span className="font-serif text-3xl font-bold text-[#1A4D2E] block">
                  {inspectCbtAttempt.utmeScore}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Out of 400 points
                </span>
              </div>

              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Raw Correct
                </span>
                <span className="font-serif text-3xl font-bold text-stone-900 block">
                  {inspectCbtAttempt.correctCount}
                </span>
                <span className="text-[10px] text-stone-500">
                  of {inspectCbtAttempt.totalQuestions} questions
                </span>
              </div>

              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Accuracy
                </span>
                <span className="font-serif text-3xl font-bold text-stone-900 block">
                  {inspectCbtAttempt.percentage}%
                </span>
                <span className="text-[10px] text-stone-500">
                  Overall percentage
                </span>
              </div>

              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Time Taken
                </span>
                <span className="font-serif text-3xl font-bold text-stone-900 block">
                  {inspectCbtAttempt.durationMinutes}m
                </span>
                <span className="text-[10px] text-stone-500">
                  {inspectCbtAttempt.startTime} – {inspectCbtAttempt.submissionTime}
                </span>
              </div>
            </div>

            {/* Subject-by-Subject Breakdown Table */}
            <div className="space-y-2">
              <h4 className="font-serif text-sm font-bold text-stone-900">
                4-Subject UTME Breakdown
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-stone-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-3 py-2.5">Raw Score</th>
                      <th className="px-3 py-2.5">Total Qs</th>
                      <th className="px-3 py-2.5">Accuracy</th>
                      <th className="px-3 py-2.5 text-right">UTME Component</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {Object.entries(inspectCbtAttempt.subjectScores).map(([subj, sc]) => {
                      const isEnglish = subj.toLowerCase() === "english";
                      const componentUtme = Math.round((sc.score / Math.max(1, sc.total)) * 100);
                      return (
                        <tr key={subj} className="hover:bg-stone-50/50">
                          <td className="px-4 py-2.5 font-bold text-stone-900 flex items-center gap-2">
                            <span>{subj}</span>
                            {isEnglish && (
                              <span className="px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-900 text-[9px] font-bold uppercase">
                                Compulsory
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{sc.score}</td>
                          <td className="px-3 py-2.5 text-stone-500">{sc.total}</td>
                          <td className="px-3 py-2.5 font-semibold text-emerald-800">{sc.percentage}%</td>
                          <td className="px-3 py-2.5 text-right font-bold text-[#1A4D2E]">
                            ~{componentUtme} / 100
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Question Breakdown Preview if available */}
            {inspectCbtAttempt.questions && inspectCbtAttempt.questions.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Question Response Samples
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                  {inspectCbtAttempt.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-stone-900">
                          Q#{idx + 1} ({q.subject})
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1",
                            q.isCorrect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          )}
                        >
                          {q.isCorrect ? (
                            <>
                              <CheckCircle2 className="size-3" /> Candidate Correct (Key {q.correctKey})
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3" /> Candidate Picked {q.selectedKey || "None"} (Correct: {q.correctKey})
                            </>
                          )}
                        </span>
                      </div>
                      <p className="font-serif text-stone-800">
                        <InlineMathText text={q.prompt} />
                      </p>
                      {q.explanation && (
                        <p className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200 font-sans">
                          Tutor Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setInspectCbtAttempt(null)}
                className="px-6 py-2.5 rounded-full bg-[#1A4D2E] text-white text-xs font-bold hover:bg-[#153e25]"
              >
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
