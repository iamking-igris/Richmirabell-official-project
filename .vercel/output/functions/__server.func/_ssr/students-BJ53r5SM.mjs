import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, r as trialLeft, t as bestByTopic } from "./session-BUK9M_Cu.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { r as seedStudents } from "./seed-admin-AUzVamgg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/students-BJ53r5SM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var tracks = {
	sciences: {
		label: "Science",
		blurb: "Physics, Chemistry, Biology, Mathematics",
		offered: [
			"physics",
			"chemistry",
			"biology",
			"mathematics"
		],
		usual: [
			"physics",
			"chemistry",
			"biology"
		]
	},
	arts: {
		label: "Art",
		blurb: "Literature, Government, History",
		offered: [
			"literature",
			"government",
			"history"
		],
		usual: [
			"literature",
			"government",
			"history"
		]
	},
	commercial: {
		label: "Commercial",
		blurb: "Economics, Accounting, Government",
		offered: [
			"economics",
			"accounting",
			"government"
		],
		usual: [
			"economics",
			"accounting",
			"government"
		]
	}
};
var filters = [
	"All",
	"Trial",
	"Paid",
	"Expired"
];
function ago(days) {
	return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}
function Students() {
	const session = useSession();
	const subjects = useContent((s) => s.subjects);
	const [filter, setFilter] = (0, import_react.useState)("All");
	const [q, setQ] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)(null);
	const rows = (0, import_react.useMemo)(() => {
		return [...session.name ? [(() => {
			const best = [...bestByTopic(session.attempts).values()];
			const t = trialLeft(session.trialStart, session.subscribed);
			return {
				id: "local",
				name: session.name,
				pathway: session.pathway ?? "sciences",
				subjects: session.selectedSubjects,
				status: session.subscribed ? "Paid" : t.active ? "Trial" : "Expired",
				joinedDaysAgo: session.trialStart ? Math.floor((Date.now() - session.trialStart) / 864e5) : 0,
				activeDaysAgo: session.attempts[0] ? Math.floor((Date.now() - session.attempts[0].at) / 864e5) : 0,
				topics: best.length,
				avg: best.length ? Math.round(best.reduce((a, x) => a + x.score / x.total, 0) / best.length * 100) : 0
			};
		})()] : [], ...seedStudents];
	}, [session]);
	const shown = rows.filter((r) => (filter === "All" || r.status === filter) && r.name.toLowerCase().includes(q.toLowerCase()));
	const nameOf = (id) => subjects.find((s) => s.id === id)?.name ?? id;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Students"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex flex-wrap items-center gap-2",
			children: [filters.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setFilter(f),
				className: cn("min-h-11 rounded-full border px-4 text-sm", filter === f ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface"),
				children: [
					f,
					" ",
					f === "All" ? rows.length : rows.filter((r) => r.status === f).length
				]
			}, f)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: q,
				onChange: (e) => setQ(e.target.value),
				placeholder: "Search by name",
				"aria-label": "Search students",
				className: "min-h-11 flex-1 rounded-xl border border-line bg-surface px-3 sm:max-w-xs"
			})]
		}),
		shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 text-muted",
			children: "No students match. Clear the search or pick another filter."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 overflow-x-auto rounded-2xl border border-line bg-surface",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[640px] text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "border-b border-line text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: [
						"Name",
						"Class",
						"Status",
						"Topics",
						"Average",
						"Last active"
					].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3 font-medium",
						children: h
					}, h)) })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
					className: "divide-y divide-line",
					children: shown.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "cursor-pointer hover:bg-paper",
						onClick: () => setOpen(open === r.id ? null : r.id),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 font-medium",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-expanded": open === r.id,
									className: "min-h-11 text-left",
									children: r.name
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: tracks[r.pathway].label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: r.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: r.topics
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: r.topics ? `${r.avg}%` : "None yet"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: ago(r.activeDaysAgo)
							})
						]
					}), open === r.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
						className: "bg-paper",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							colSpan: 6,
							className: "px-4 py-3 text-muted",
							children: [
								"Subjects: ",
								r.subjects.map(nameOf).join(", ") || "Not chosen yet",
								" · Joined ",
								ago(r.joinedDaysAgo).toLowerCase()
							]
						})
					})] }, r.id))
				})]
			})
		})
	] });
}
//#endregion
export { Students as component };
