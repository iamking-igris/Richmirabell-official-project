import { t as demoWaecPapers } from "./waec-BnOIvMdY.mjs";
import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, r as availableSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cbt-BzAe_oXO.js
var import_jsx_runtime = require_jsx_runtime();
function CbtPage() {
	const available = availableSubjects(useContent((s) => s.subjects));
	const exams = useSession((s) => s.exams);
	const jamb = useSession((s) => s.jambSubjects);
	const demoMode = useSession((s) => s.demoMode);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Take CBT"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Three separate experiences. Topic practice uses the loaded subject notes. WAEC and JAMB demos are synthetic test papers, not official examinations."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-6 space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-2xl border border-line bg-surface p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-primary",
								children: "Open"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-display text-2xl",
								children: "Topic Practice"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: "Short sets on any loaded subject topic. Not a full exam."
							}),
							available.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 flex flex-wrap gap-2",
								children: available.slice(0, 4).map((subject) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio/subject/$id",
									params: { id: subject.id },
									className: "inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold text-primary",
									children: subject.name
								}, subject.id))
							}) : null
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-2xl border border-line bg-surface p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-primary",
								children: demoMode ? "Demo open" : "Demo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-display text-2xl",
								children: "WAEC past papers"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: demoMode ? "Synthetic WAEC-style papers for UI testing. Clearly labelled DEMO — not authentic past papers." : "Turn on Demo mode in Account to exercise the WAEC workflow with synthetic papers."
							}),
							demoMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 space-y-2",
								children: demoWaecPapers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/studio/cbt/waec/$paperId",
									params: { paperId: p.id },
									className: "inline-flex min-h-11 items-center text-sm font-semibold text-primary",
									children: [p.title, " →"]
								}) }, p.id))
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/studio/account",
								className: "mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary",
								children: "Open Account / demo controls"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-2xl border border-line bg-surface p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-semibold text-primary",
								children: demoMode ? "Demo open" : "Demo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-display text-2xl",
								children: "Full JAMB CBT"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: demoMode ? "A timed 40-question demo paper (English + three subjects) with synthetic items. Not an official JAMB simulation." : "Turn on Demo mode in Account to run a synthetic JAMB CBT session."
							}),
							exams.includes("jamb") && jamb.length === 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted",
								children: [
									"Your combination: English, ",
									jamb.join(", "),
									"."
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted",
								children: "Optional: set your four subjects in Account. Demo still runs with a standard set."
							}),
							demoMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/studio/cbt/jamb",
								className: "mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
								children: "Start demo JAMB CBT"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/studio/account",
								className: "mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary",
								children: "Open Account / demo controls"
							})
						]
					})
				]
			})
		]
	});
}
//#endregion
export { CbtPage as component };
