import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, r as availableSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, t as bestByTopic } from "./session-BUK9M_Cu.mjs";
import { i as plural } from "./format-44Ft2NgX.mjs";
import { t as attemptsByKind } from "./assessment-BvX2l6XN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/progress-BwQ-daJW.js
var import_jsx_runtime = require_jsx_runtime();
function ProgressPage() {
	const attempts = useSession((s) => s.attempts);
	const demoMode = useSession((s) => s.demoMode);
	const best = bestByTopic(attempts);
	const subjects = availableSubjects(useContent((s) => s.subjects));
	const { topic: topicAttempts, jamb, waec } = attemptsByKind(attempts);
	const groups = subjects.map((subject) => ({
		subject,
		rows: subject.topics.filter((t) => demoMode || t.origin !== "demo").map((topic) => {
			const attempt = best.get(topic.id);
			return {
				topic,
				attempt,
				tries: topicAttempts.filter((a) => a.topicId === topic.id).length,
				pct: attempt ? Math.round(attempt.score / Math.max(attempt.total, 1) * 100) : null
			};
		})
	}));
	const sat = groups.flatMap((g) => g.rows.map((r) => ({
		...r,
		subject: g.subject
	}))).filter((r) => r.pct !== null);
	const weak = [...sat].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).slice(0, 3);
	const average = sat.length ? Math.round(sat.reduce((s, r) => s + (r.pct ?? 0), 0) / sat.length) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Progress"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-xl text-muted",
			children: attempts.length === 0 ? "No attempts yet. Open Physics for a topic quiz, or use Take CBT for demo JAMB/WAEC papers." : `${plural(topicAttempts.length, "topic attempt")} · ${plural(jamb.length, "JAMB demo")} · ${plural(waec.length, "WAEC demo")}${average != null ? ` · topic average of best ${average}%` : ""}`
		}),
		weak.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-8 font-display text-2xl",
			children: "Needs attention"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 grid gap-3 sm:grid-cols-3",
			children: weak.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-col rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [row.subject.name, " · topic quiz"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-medium",
						children: row.topic.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-display text-4xl",
						children: [row.pct, "%"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-auto flex gap-2 pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio/topic/$id",
							params: { id: row.topic.id },
							className: "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-line text-sm font-semibold",
							children: "Read note"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio/practice/$id",
							params: { id: row.topic.id },
							className: "inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg",
							children: "Practise"
						})]
					})
				]
			}, row.topic.id))
		})] }),
		groups.map(({ subject, rows }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "font-display text-2xl",
				children: [subject.name, " — topic quizzes"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
				children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/topic/$id",
					params: { id: row.topic.id },
					className: "flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "block font-medium",
						children: [row.topic.title, row.topic.origin === "demo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-xs text-muted",
							children: "DEMO"
						}) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-muted",
						children: row.tries === 0 ? "Not started" : `${plural(row.tries, "attempt")} · best ${row.attempt?.score}/{row.attempt?.total}`
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold",
						children: row.attempt ? `${row.pct}%` : ""
					})]
				}) }, row.topic.id))
			})]
		}, subject.id)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: "JAMB CBT attempts"
			}), jamb.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 rounded-2xl border border-dashed border-line p-5 text-sm text-muted",
				children: "No JAMB CBT attempts yet. Demo mode provides a synthetic 40-question paper from Take CBT."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
				children: jamb.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/review/$attemptId",
					params: { attemptId: a.id },
					className: "flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-medium",
						children: a.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "block text-xs text-muted",
						children: [new Date(a.at).toLocaleString(), a.demo ? " · DEMO" : ""]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm font-semibold",
						children: [
							a.score,
							"/",
							a.total
						]
					})]
				}) }, a.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: "WAEC attempts"
			}), waec.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 rounded-2xl border border-dashed border-line p-5 text-sm text-muted",
				children: "No WAEC attempts yet. Demo mode provides synthetic papers from Take CBT."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
				children: waec.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/review/$attemptId",
					params: { attemptId: a.id },
					className: "flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-medium",
						children: a.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "block text-xs text-muted",
						children: [new Date(a.at).toLocaleString(), a.demo ? " · DEMO" : ""]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold",
						children: a.total > 0 ? `${a.score}/${a.total}` : "Theory"
					})]
				}) }, a.id))
			})]
		})
	] });
}
//#endregion
export { ProgressPage as component };
