import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Eye,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  Check,
  Calendar,
  Layers,
  DollarSign,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  useTransactionStore,
  calculateFinancialSummary,
  type TransactionRecord,
  type TransactionStatus,
} from "@/lib/transaction-store";
import { useStudentStore } from "@/lib/student-store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { naira } from "@/lib/format";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin/payments")({ component: PaymentsAndRevenueCenter });

export function PaymentsAndRevenueCenter() {
  const transactions = useTransactionStore((s) => s.transactions);
  const updateInternalNotes = useTransactionStore((s) => s.updateInternalNotes);
  const processRefund = useTransactionStore((s) => s.processRefund);

  // Cross-module access
  const students = useStudentStore((s) => s.students);
  const subscribers = useSubscriptionStore((s) => s.subscribers);

  // Active workspace section
  const [activeTab, setActiveTab] = useState<
    "overview" | "ledger" | "analysis" | "investigation" | "refunds"
  >("ledger");

  // Notifications
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function notify(message: string, type: "success" | "error" = "success") {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  }

  // --- Dynamic Financial Calculations from the Ledger ---
  const summary = useMemo(() => calculateFinancialSummary(transactions), [transactions]);

  // --- Search & Filters for Ledger ---
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [planFilter, setPlanFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "name_asc">("date_desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected Transaction for Drawer / Inspection
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Refund Modal State
  const [refundTargetTx, setRefundTargetTx] = useState<TransactionRecord | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<number>(4500);
  const [refundReasonInput, setRefundReasonInput] = useState("");
  const [refundOperatorInput, setRefundOperatorInput] = useState("Admin (Finance Desk)");

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesStatus = statusFilter === "All" || t.status === statusFilter;
        const matchesPlan = planFilter === "All" || t.planName.toLowerCase().includes(planFilter.toLowerCase());

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          t.reference.toLowerCase().includes(q) ||
          t.studentName.toLowerCase().includes(q) ||
          (t.studentIdNumber && t.studentIdNumber.toLowerCase().includes(q)) ||
          t.studentId.toLowerCase().includes(q);

        return matchesStatus && matchesPlan && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") return b.createdAt - a.createdAt;
        if (sortBy === "date_asc") return a.createdAt - b.createdAt;
        if (sortBy === "amount_desc") return b.amount - a.amount;
        if (sortBy === "name_asc") return a.studentName.localeCompare(b.studentName);
        return 0;
      });
  }, [transactions, statusFilter, planFilter, searchQuery, sortBy]);

  // Pagination slice
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  function handleOpenDetails(tx: TransactionRecord) {
    setSelectedTx(tx);
    setEditingNotes(tx.internalNotes || "");
    setIsEditingNotes(false);
  }

  function handleSaveNotes() {
    if (!selectedTx) return;
    updateInternalNotes(selectedTx.id, editingNotes.trim());
    setSelectedTx({ ...selectedTx, internalNotes: editingNotes.trim() });
    setIsEditingNotes(false);
    notify("Internal investigation notes updated.");
  }

  function handleOpenRefundModal(tx: TransactionRecord) {
    setRefundTargetTx(tx);
    setRefundAmountInput(tx.amount);
    setRefundReasonInput("");
    setRefundOperatorInput("Admin (Finance Desk)");
  }

  function handleConfirmRefund() {
    if (!refundTargetTx) return;
    if (!refundReasonInput.trim()) {
      notify("A mandatory justification reason is required for refunds.", "error");
      return;
    }

    const res = processRefund({
      transactionId: refundTargetTx.id,
      refundAmount: refundAmountInput,
      reason: refundReasonInput.trim(),
      processedBy: refundOperatorInput.trim() || "Admin (Finance Desk)",
    });

    if (res.success) {
      notify(`Refund processed successfully for ${refundTargetTx.reference}. Net revenue adjusted.`);
      setRefundTargetTx(null);
      if (selectedTx?.id === refundTargetTx.id) {
        setSelectedTx(null);
      }
    } else {
      notify(res.error || "Failed to process refund", "error");
    }
  }

  // Cross-reference data for selected transaction
  const linkedStudent = useMemo(() => {
    if (!selectedTx) return null;
    return (
      students.find((s) => s.id === selectedTx.studentId || s.name.toLowerCase() === selectedTx.studentName.toLowerCase()) || null
    );
  }, [selectedTx, students]);

  const linkedSubscription = useMemo(() => {
    if (!selectedTx) return null;
    return (
      subscribers.find((sub) => sub.lastPaymentReference === selectedTx.reference || sub.studentId === selectedTx.studentId) || null
    );
  }, [selectedTx, subscribers]);

  const otherTransactionsForStudent = useMemo(() => {
    if (!selectedTx) return [];
    return transactions.filter((t) => t.id !== selectedTx.id && (t.studentId === selectedTx.studentId || t.studentName.toLowerCase() === selectedTx.studentName.toLowerCase()));
  }, [selectedTx, transactions]);

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all",
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-red-200 bg-red-50 text-red-900"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="size-4 text-green-600" /> : <AlertCircle className="size-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-muted hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Administration</span>
            <span>·</span>
            <span>Financial Control Ledger</span>
          </div>
          <h1 className="font-display text-4xl text-ink">Payments & Revenue</h1>
          <p className="mt-1 text-sm text-muted">
            The official financial source of truth. Confirmed payments, refund adjustments, transaction audits, and student cross-references.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-muted">
            Payment Gateway & Revenue Operations
          </span>
        </div>
      </div>

      {/* Section 1: Financial Overview Metric Cards (Interactive click-to-filter) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("Successful");
            setActiveTab("ledger");
          }}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            statusFilter === "Successful" && activeTab === "ledger"
              ? "border-green-600 bg-green-50/50 ring-2 ring-green-600/20"
              : "border-line bg-surface hover:border-line/80 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="size-4 text-green-600" />
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{naira(summary.totalSuccessfulRevenue)}</p>
          <p className="mt-1 text-xs text-muted">{summary.successfulCount} successful payments</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Refunded");
            setActiveTab("ledger");
          }}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            statusFilter === "Refunded" && activeTab === "ledger"
              ? "border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20"
              : "border-line bg-surface hover:border-line/80 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Refunds</span>
            <RotateCcw className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{naira(summary.totalRefundedAmount)}</p>
          <p className="mt-1 text-xs text-muted">{summary.refundedCount} transactions reversed</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("All");
            setActiveTab("overview");
          }}
          className="rounded-2xl border border-line bg-surface p-4 text-left shadow-sm hover:border-primary transition-all"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Revenue</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-primary">{naira(summary.netRevenue)}</p>
          <p className="mt-1 text-xs text-muted">Gross minus processed refunds</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Pending");
            setActiveTab("ledger");
          }}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            statusFilter === "Pending" && activeTab === "ledger"
              ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
              : "border-line bg-surface hover:border-line/80 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{summary.pendingCount}</p>
          <p className="mt-1 text-xs text-muted">Awaiting confirmation</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Failed");
            setActiveTab("ledger");
          }}
          className={cn(
            "rounded-2xl border p-4 text-left transition-all",
            statusFilter === "Failed" && activeTab === "ledger"
              ? "border-red-600 bg-red-50/50 ring-2 ring-red-600/20"
              : "border-line bg-surface hover:border-line/80 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed</span>
            <XCircle className="size-4 text-red-500" />
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{summary.failedCount}</p>
          <p className="mt-1 text-xs text-muted">Not counted as revenue</p>
        </button>

        <div className="rounded-2xl border border-line bg-surface p-4 text-left shadow-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg. Value</span>
            <CreditCard className="size-4 text-ink" />
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{naira(summary.averageTransactionValue)}</p>
          <p className="mt-1 text-xs text-muted">Per paid subscription</p>
        </div>
      </div>

      {/* Internal Navigation Tabs (5 Sections) */}
      <div className="flex border-b border-line overflow-x-auto text-sm font-medium scrollbar-none">
        {[
          { key: "ledger", label: "Transaction Ledger", icon: FileText, count: transactions.length },
          { key: "overview", label: "Financial Overview", icon: DollarSign },
          { key: "analysis", label: "Revenue Analysis", icon: TrendingUp },
          { key: "investigation", label: "Payment Investigation", icon: Search },
          { key: "refunds", label: "Refunds & Adjustments", icon: RotateCcw, count: summary.refundedCount },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted hover:border-line hover:text-ink"
              )}
            >
              <Icon className={cn("size-4", isActive ? "text-primary" : "text-muted")} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive ? "bg-soft text-primary" : "bg-paper text-muted"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRANSACTION LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Controls: Search, Filters, Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search reference, student name, or ID..."
                className="min-h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="All">All Statuses ({transactions.length})</option>
              <option value="Successful">Successful ({summary.successfulCount})</option>
              <option value="Pending">Pending ({summary.pendingCount})</option>
              <option value="Failed">Failed ({summary.failedCount})</option>
              <option value="Refunded">Refunded ({summary.refundedCount})</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="All">All Plans</option>
              <option value="Monthly">Monthly Access</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="date_desc">Newest Transactions</option>
              <option value="date_asc">Oldest Transactions</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="name_asc">Candidate Name A–Z</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/50 text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Payment Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                      No matching transactions found in ledger.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-paper/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(tx)}
                          className="font-mono text-xs font-semibold text-primary hover:underline text-left block"
                        >
                          {tx.reference}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-ink">{tx.studentName}</p>
                        <p className="text-xs text-muted font-mono">{tx.studentIdNumber || tx.studentId}</p>
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-ink">{tx.planName}</td>
                      <td className="px-3 py-3 font-semibold text-ink">{naira(tx.amount)}</td>
                      <td className="px-3 py-3 text-xs text-muted">{tx.method}</td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleDateString("en-NG")}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            tx.status === "Successful" && "bg-green-50 text-green-800",
                            tx.status === "Pending" && "bg-amber-50 text-amber-800",
                            tx.status === "Failed" && "bg-red-50 text-red-800",
                            tx.status === "Refunded" && "bg-purple-50 text-purple-800"
                          )}
                        >
                          {tx.status === "Successful" && <Check className="size-3" />}
                          {tx.status === "Pending" && <Clock className="size-3" />}
                          {tx.status === "Failed" && <X className="size-3" />}
                          {tx.status === "Refunded" && <RotateCcw className="size-3" />}
                          <span>{tx.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(tx)}
                            className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                          >
                            Inspect
                          </button>
                          {tx.status === "Successful" && (
                            <button
                              type="button"
                              onClick={() => handleOpenRefundModal(tx)}
                              className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:text-red-600"
                              title="Process Refund"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted pt-2">
            <span>
              Showing {filteredTransactions.length > 0 ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-medium text-ink">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FINANCIAL OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="font-display text-2xl text-ink">Financial Accounting Principles & Ledger Rules</h2>
            <p className="mt-1 text-sm text-muted">
              How the Richmirabel financial ledger accounts for candidate subscriptions and revenue.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <CheckCircle2 className="size-4" />
                  <span>Gross Revenue Recognition</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Gross revenue is strictly the sum of confirmed, successful payments (currently <strong>{naira(summary.totalSuccessfulRevenue)}</strong>). Failed, cancelled, or pending payments are never counted.
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                  <RotateCcw className="size-4" />
                  <span>Refund Deductions</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Refunds are accounted for separately without rewriting historical transactions (<strong>{naira(summary.totalRefundedAmount)}</strong>). Net Revenue is strictly Gross Revenue minus Refunds (<strong>{naira(summary.netRevenue)}</strong>).
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
                  <ShieldAlert className="size-4" />
                  <span>Manual Access Independence</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Complimentary scholarships and manual access grants are managed in Subscriptions. They create no financial transactions and contribute ₦0 to revenue.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-6">
              <h3 className="font-display text-lg text-ink">Ledger Reconciliation Breakdown</h3>
              <dl className="mt-3 divide-y divide-line text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Total Recorded Transactions</dt>
                  <dd className="font-semibold text-ink">{summary.totalCount}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Confirmed Successful Payments</dt>
                  <dd className="font-semibold text-green-700">{summary.successfulCount} ({naira(summary.totalSuccessfulRevenue)})</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Refunded Payments</dt>
                  <dd className="font-semibold text-amber-700">{summary.refundedCount} (-{naira(summary.totalRefundedAmount)})</dd>
                </div>
                <div className="flex justify-between py-2.5 font-bold">
                  <dt className="text-ink">Net Recognized Revenue</dt>
                  <dd className="text-primary text-base">{naira(summary.netRevenue)}</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Pending Verification</dt>
                  <dd className="font-semibold text-amber-600">{summary.pendingCount} (₦0 recognized)</dd>
                </div>
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted">Failed Attempts</dt>
                  <dd className="font-semibold text-red-600">{summary.failedCount} (₦0 recognized)</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="font-display text-2xl text-ink">Revenue & Payment Method Distribution</h2>
            <p className="mt-1 text-sm text-muted">Real ledger distribution based on confirmed transaction records.</p>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Card Payment Method */}
              <div className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Card Payments</p>
                <p className="mt-2 font-display text-2xl text-ink">
                  {naira(transactions.filter((t) => t.status === "Successful" && t.method === "Card").reduce((s, t) => s + t.amount, 0))}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {transactions.filter((t) => t.status === "Successful" && t.method === "Card").length} successful payments
                </p>
              </div>

              {/* Bank Transfer Method */}
              <div className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Direct Bank Transfer</p>
                <p className="mt-2 font-display text-2xl text-ink">
                  {naira(transactions.filter((t) => t.status === "Successful" && t.method === "Bank transfer").reduce((s, t) => s + t.amount, 0))}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {transactions.filter((t) => t.status === "Successful" && t.method === "Bank transfer").length} successful payments
                </p>
              </div>

              {/* USSD Method */}
              <div className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">USSD String</p>
                <p className="mt-2 font-display text-2xl text-ink">
                  {naira(transactions.filter((t) => t.status === "Successful" && t.method === "USSD").reduce((s, t) => s + t.amount, 0))}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {transactions.filter((t) => t.status === "Successful" && t.method === "USSD").length} successful payments
                </p>
              </div>
            </div>

            {/* Failure Analysis */}
            <div className="mt-6 border-t border-line pt-6">
              <h3 className="font-display text-lg text-ink">Payment Failure & Dispute Investigation</h3>
              <div className="mt-3 divide-y divide-line text-xs">
                {transactions.filter((t) => t.status === "Failed").map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-ink">{tx.reference}</span>
                      <span className="text-muted ml-2">({tx.studentName} · {tx.method})</span>
                      <p className="text-red-700 mt-0.5">{tx.failureReason || "Transaction declined by card processor or bank network timeout."}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(tx)}
                      className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-soft"
                    >
                      Audit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYMENT INVESTIGATION */}
      {/* ========================================================================= */}
      {activeTab === "investigation" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="font-display text-2xl text-ink">Payment Investigation Console</h2>
            <p className="mt-1 text-sm text-muted">
              Select any transaction to inspect root payment responses, candidate subscriptions, and historical payment timelines.
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Quick Investigation Lookup</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {transactions.slice(0, 6).map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => handleOpenDetails(tx)}
                    className="flex items-center justify-between rounded-xl border border-line bg-paper p-3 text-left hover:border-primary transition-all"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-primary">{tx.reference}</p>
                      <p className="text-xs font-medium text-ink">{tx.studentName}</p>
                      <p className="text-[11px] text-muted">{tx.status} · {naira(tx.amount)}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REFUNDS & ADJUSTMENTS */}
      {/* ========================================================================= */}
      {activeTab === "refunds" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">Refunds & Reversals Ledger</h2>
                <p className="mt-1 text-sm text-muted">
                  Formal refund records linked to original transactions. Reversals adjust Net Revenue without deleting original records.
                </p>
              </div>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800">
                {summary.refundedCount} Processed Reversals
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper/50 text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Refund Ref</th>
                    <th className="px-3 py-3">Original Payment</th>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Refund Amount</th>
                    <th className="px-3 py-3">Processed Date</th>
                    <th className="px-4 py-3">Justification</th>
                    <th className="px-3 py-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transactions.filter((t) => t.status === "Refunded").length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                        No refund records currently in the ledger.
                      </td>
                    </tr>
                  ) : (
                    transactions
                      .filter((t) => t.status === "Refunded")
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-paper/30">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-purple-700">
                            {tx.refundInfo?.refundReference || "RF-MANUAL"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-primary font-medium">
                            {tx.reference}
                          </td>
                          <td className="px-3 py-3 font-medium text-ink">{tx.studentName}</td>
                          <td className="px-3 py-3 font-semibold text-red-600">
                            -{naira(tx.refundInfo?.refundAmount || tx.amount)}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted">
                            {tx.refundInfo?.refundedAt
                              ? new Date(tx.refundInfo.refundedAt).toLocaleDateString("en-NG")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted max-w-xs truncate" title={tx.refundInfo?.reason}>
                            {tx.refundInfo?.reason || "Administrative reversal"}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted">{tx.refundInfo?.processedBy || "Finance"}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRANSACTION DETAIL INSPECTION DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-3xl bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Transaction Audit Record</span>
                <h3 className="font-display text-2xl font-mono text-ink">{selectedTx.reference}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="rounded-full p-1 text-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Financial Status Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Transaction Amount</p>
                  <p className="mt-1 font-display text-2xl text-ink">{naira(selectedTx.amount)}</p>
                  <p className="text-[11px] text-muted">{selectedTx.currency} · Method: {selectedTx.method}</p>
                </div>

                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="text-muted">Payment Status</p>
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        selectedTx.status === "Successful" && "bg-green-50 text-green-800",
                        selectedTx.status === "Pending" && "bg-amber-50 text-amber-800",
                        selectedTx.status === "Failed" && "bg-red-50 text-red-800",
                        selectedTx.status === "Refunded" && "bg-purple-50 text-purple-800"
                      )}
                    >
                      {selectedTx.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {selectedTx.status === "Successful" && "Confirmed revenue"}
                    {selectedTx.status === "Pending" && "Pending settlement verification"}
                    {selectedTx.status === "Failed" && "Failed transaction; ₦0 revenue"}
                    {selectedTx.status === "Refunded" && "Reversed transaction"}
                  </p>
                </div>
              </div>

              {/* Linked Student Section */}
              <div className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink text-xs uppercase tracking-wider">Candidate Account</p>
                  <Link
                    to="/admin/students"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>Open Student Profile</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted">Name:</span> <span className="font-semibold text-ink">{selectedTx.studentName}</span>
                  </div>
                  <div>
                    <span className="text-muted">Student ID:</span> <span className="font-mono text-ink">{selectedTx.studentIdNumber || selectedTx.studentId}</span>
                  </div>
                  {linkedStudent && (
                    <>
                      <div>
                        <span className="text-muted">Account Status:</span>{" "}
                        <span className={cn("font-medium", linkedStudent.status === "Active" ? "text-green-700" : "text-red-700")}>
                          {linkedStudent.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Current Plan:</span> <span className="text-ink font-medium">{linkedStudent.accessPlan}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Linked Subscription Section */}
              <div className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink text-xs uppercase tracking-wider">Associated Subscription</p>
                  <Link
                    to="/admin/subscriptions"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>Subscriptions Hub</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                <div className="mt-2 space-y-1">
                  <p><span className="text-muted">Plan Product:</span> <span className="font-medium text-ink">{selectedTx.planName}</span></p>
                  {linkedSubscription ? (
                    <>
                      <p>
                        <span className="text-muted">Access Period:</span>{" "}
                        <span className="text-ink font-medium">
                          {new Date(linkedSubscription.startDate).toLocaleDateString("en-NG")} – {new Date(linkedSubscription.endDate).toLocaleDateString("en-NG")}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted">Subscription Status:</span>{" "}
                        <span className="font-semibold text-primary">{linkedSubscription.status}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-muted italic">Associated 30-day access period recorded under candidate account.</p>
                  )}
                </div>
              </div>

              {/* Failure or Refund Info */}
              {selectedTx.failureReason && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-red-900">
                  <p className="font-semibold">Recorded Failure Reason:</p>
                  <p className="mt-0.5">{selectedTx.failureReason}</p>
                </div>
              )}

              {selectedTx.refundInfo && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-purple-950">
                  <div className="flex justify-between">
                    <span className="font-semibold">Refund Reference: {selectedTx.refundInfo.refundReference}</span>
                    <span className="font-bold text-red-700">-{naira(selectedTx.refundInfo.refundAmount)}</span>
                  </div>
                  <p className="mt-1"><span className="text-muted">Reason:</span> {selectedTx.refundInfo.reason}</p>
                  <p className="mt-0.5 text-[11px] text-muted">Processed by {selectedTx.refundInfo.processedBy} on {new Date(selectedTx.refundInfo.refundedAt).toLocaleDateString("en-NG")}</p>
                </div>
              )}

              {/* Internal Notes */}
              <div className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink text-xs uppercase tracking-wider">Internal Administrative Notes</p>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(true)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add investigation details, bank support ticket IDs, or reconciliation notes..."
                      className="w-full rounded-xl border border-line bg-surface p-2 text-xs text-ink focus:border-primary focus:outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingNotes(false)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        className="rounded-lg bg-ink px-3 py-1 text-xs font-semibold text-primary-fg"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-muted italic">
                    {selectedTx.internalNotes || "No internal notes recorded for this transaction."}
                  </p>
                )}
              </div>

              {/* Other Transactions for this Candidate */}
              {otherTransactionsForStudent.length > 0 && (
                <div>
                  <p className="font-semibold text-ink text-xs uppercase tracking-wider">
                    Other Candidate Transactions ({otherTransactionsForStudent.length})
                  </p>
                  <div className="mt-1 divide-y divide-line rounded-xl border border-line bg-paper/50">
                    {otherTransactionsForStudent.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5">
                        <div>
                          <span className="font-mono font-semibold text-primary">{t.reference}</span>
                          <span className="text-muted ml-2">{new Date(t.createdAt).toLocaleDateString("en-NG")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{naira(t.amount)}</span>
                          <span className="text-[11px] text-muted">({t.status})</span>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(t)}
                            className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted hover:text-ink"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
              {selectedTx.status === "Successful" && (
                <button
                  type="button"
                  onClick={() => handleOpenRefundModal(selectedTx)}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Process Refund
                </button>
              )}
              <div className="flex-1 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-ink/90"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REFUND MODAL */}
      {/* ========================================================================= */}
      {refundTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-xl text-ink">Process Transaction Refund</h3>
            <p className="mt-1 text-xs text-muted">
              Reverse payment for <strong>{refundTargetTx.reference}</strong> ({refundTargetTx.studentName}).
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-line bg-paper p-3">
                <div className="flex justify-between">
                  <span className="text-muted">Original Amount:</span>
                  <span className="font-semibold text-ink">{naira(refundTargetTx.amount)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted">Method:</span>
                  <span className="font-medium text-ink">{refundTargetTx.method}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Refund Amount (NGN)</label>
                <input
                  type="number"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(Number(e.target.value))}
                  max={refundTargetTx.amount}
                  min={1}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                  Audit Justification Reason (Required)
                </label>
                <textarea
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="e.g. Candidate double payment confirmed with parent bank slip..."
                  className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-xs text-ink focus:border-primary focus:outline-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted">Authorized By</label>
                <input
                  type="text"
                  value={refundOperatorInput}
                  onChange={(e) => setRefundOperatorInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setRefundTargetTx(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
