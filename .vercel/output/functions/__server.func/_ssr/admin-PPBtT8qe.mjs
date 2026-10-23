import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, o as locateTopic, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { i as seedWeakTopics, n as seedRecent, r as seedStudents, t as seedPayments } from "./seed-admin-AUzVamgg.mjs";
import { n as naira } from "./format-44Ft2NgX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-PPBtT8qe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Overview() {
	const subjects = useContent((s) => s.subjects);
	const local = useSession((s) => s.payments);
	const attempts = useSession((s) => s.attempts);
	const name = useSession((s) => s.name);
	const subscribed = useSession((s) => s.subscribed);
	const published = publishedSubjects(subjects).flatMap((s) => s.topics);
	const payments = (0, import_react.useMemo)(() => [...local, ...seedPayments()].filter((p) => p.status === "Successful"), [local]);
	const students = seedStudents.length + (name ? 1 : 0);
	const trials = seedStudents.filter((x) => x.status === "Trial").length + (name && !subscribed ? 1 : 0);
	const active = seedStudents.filter((x) => x.activeDaysAgo <= 7).length + (name ? 1 : 0);
	const weekSets = 146 + attempts.length;
	const recent = [...attempts.slice(0, 3).map((a) => ({
		name,
		topicId: a.topicId,
		score: a.score,
		total: a.total,
		label: new Date(a.at).toLocaleTimeString("en-NG", {
			hour: "numeric",
			minute: "2-digit"
		})
	})), ...seedRecent.map((r) => ({
		...r,
		label: r.minutesAgo < 60 ? `${r.minutesAgo} min ago` : `${Math.round(r.minutesAgo / 60)} h ago`
	}))].slice(0, 6);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Overview"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Active students",
					value: String(active)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Trials running",
					value: String(trials)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Paid this term",
					value: String(payments.length)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Revenue",
					value: naira(payments.reduce((s, p) => s + p.amount, 0))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Sets sat this week",
					value: String(weekSets)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 text-sm text-muted",
			children: [
				students,
				" students · ",
				published.length,
				" topics published"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Weakest topics across students"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-4",
					children: seedWeakTopics.map((w) => {
						const hit = locateTopic(subjects, w.topicId);
						if (!hit) return null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								hit.topic.title,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: ["· ", hit.subject.name]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-semibold",
								children: [w.avg, "%"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full bg-primary",
								style: { width: `${w.avg}%` }
							})
						})] }, w.topicId);
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-line bg-surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Recent attempts"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 divide-y divide-line text-sm",
					children: recent.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between gap-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							r.name,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: ["· ", locateTopic(subjects, r.topicId)?.topic.title ?? r.topicId]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
									r.score,
									"/",
									r.total
								] }),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: r.label
								})
							]
						})]
					}, i))
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 flex flex-wrap gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/admin/topics",
					className: "inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
					children: "Add topic"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/admin/briefings",
					className: "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm",
					children: "Add briefing"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/admin/payments",
					className: "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-sm",
					children: "View payments"
				})
			]
		})
	] });
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-line bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-2xl sm:text-3xl",
			children: value
		})]
	});
}
//#endregion
export { Overview as component };
