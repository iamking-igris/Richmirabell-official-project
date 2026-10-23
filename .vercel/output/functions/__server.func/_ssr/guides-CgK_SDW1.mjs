import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guides-CgK_SDW1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GuidesPage() {
	const news = useContent((s) => s.news);
	const guides = useContent((s) => s.guides);
	const [category, setCategory] = (0, import_react.useState)("all");
	const [open, setOpen] = (0, import_react.useState)(null);
	const shown = [...news.map((item) => ({
		id: item.id,
		title: item.title,
		body: item.body,
		category: "briefings",
		note: "General study advice"
	})), ...guides.map((item) => ({
		id: item.id,
		title: item.title,
		body: [item.detail, ...item.points].join("\n"),
		category: item.id === "objectives" || item.id === "practical" ? "tips" : "answering",
		note: item.id === "theory" ? "General advice, not a universal marking scheme" : "General advice"
	}))].filter((item) => category === "all" || item.category === category);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl",
					children: "Guides"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-xl text-muted",
					children: "Practical exam advice and answer-writing guidance to help students prepare and earn marks."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => window.print(),
					className: "rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold print:hidden",
					children: "Print this guide"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 flex gap-2 overflow-x-auto pb-1",
				role: "tablist",
				"aria-label": "Guide categories",
				children: [
					["all", "All"],
					["briefings", "Exam Briefings"],
					["answering", "Answering Guides"],
					["tips", "Objective & Practical Tips"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": category === id,
					onClick: () => setCategory(id),
					className: cn("min-h-11 shrink-0 rounded-full border px-4 text-sm", category === id ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface"),
					children: label
				}, id))
			}),
			shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-muted",
				children: "Nothing in this category yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-5 space-y-3",
				children: shown.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-2xl border border-line bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setOpen(open === item.id ? null : item.id),
						className: "flex w-full min-h-14 items-start justify-between gap-3 px-4 py-3 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-medium",
							children: item.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted",
							children: item.note
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: open === item.id ? "Close" : "Open"
						})]
					}), open === item.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-line px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
						children: [item.id === "theory" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-muted",
							children: "This is general advice. Mark allocations change with the question. Answer what that question asks. Do not treat any split as a universal WAEC scheme."
						}), item.body]
					})]
				}, item.id))
			})
		]
	});
}
//#endregion
export { GuidesPage as component };
