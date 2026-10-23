import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as groupByMainTopic, c as useContent, l as visibleTopics, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, t as bestByTopic } from "./session-BUK9M_Cu.mjs";
import { r as photoOf } from "./format-44Ft2NgX.mjs";
import { m as Check } from "../_libs/lucide-react.mjs";
import { i as Route$2 } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/subject._id-D5fTxQF1.js
var import_jsx_runtime = require_jsx_runtime();
function SubjectPage() {
	const { id } = Route$2.useParams();
	const subject = publishedSubjects(useContent((s) => s.subjects)).find((s) => s.id === id);
	const best = bestByTopic(useSession((s) => s.attempts));
	const demoMode = useSession((s) => s.demoMode);
	if (!subject) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Subject not found"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/studio",
			className: "mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
			children: "Back to dashboard"
		})]
	});
	const topics = visibleTopics(subject.topics, demoMode);
	const groups = groupByMainTopic(topics);
	const demoCount = topics.filter((t) => t.origin === "demo").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/studio",
			className: "inline-flex min-h-11 items-center text-sm font-semibold text-primary",
			children: "Dashboard"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative mt-4 overflow-hidden rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: photoOf(subject),
					alt: "",
					className: "aspect-[16/7] w-full object-cover sm:aspect-[21/7]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-x-0 bottom-0 p-5 text-primary-fg sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-primary-fg/80",
							children: subject.exam
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl sm:text-5xl",
							children: subject.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 max-w-xl text-sm text-primary-fg/85",
							children: subject.blurb
						})
					]
				})
			]
		}),
		demoMode && demoCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-4 rounded-2xl border border-dashed border-line bg-soft/60 px-4 py-3 text-sm text-muted",
			children: [
				"Demo mode is on. ",
				demoCount,
				" synthetic subtopic",
				demoCount === 1 ? "" : "s",
				" are included for testing and are labelled DEMO. They are not teacher-approved content."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-6",
			children: groups.map(({ main, items }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: main
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
				children: items.map((topic, index) => {
					const attempt = best.get(topic.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/studio/topic/$id",
						params: { id: topic.id },
						className: "flex min-h-16 items-center gap-4 px-4 py-4 hover:bg-paper sm:px-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-6 text-sm text-muted",
								children: index + 1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "block font-medium",
									children: [topic.title, topic.origin === "demo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-muted",
										children: "DEMO"
									}) : null]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block truncate text-sm text-muted",
									children: topic.summary
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "shrink-0 text-right text-sm",
								children: attempt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 font-semibold text-primary",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
											className: "size-4",
											"aria-hidden": true
										}),
										"Best ",
										attempt.score,
										"/",
										attempt.total
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: [topic.minutes, " min"]
								})
							})
						]
					}) }, topic.id);
				})
			})] }, main))
		})
	] });
}
//#endregion
export { SubjectPage as component };
