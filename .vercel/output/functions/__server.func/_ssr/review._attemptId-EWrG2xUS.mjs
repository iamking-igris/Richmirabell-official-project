import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession, n as findAttempt } from "./session-BUK9M_Cu.mjs";
import { n as keyLabel } from "./assessment-BvX2l6XN.mjs";
import { m as Check, t as X } from "../_libs/lucide-react.mjs";
import { a as Route$3 } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/review._attemptId-EWrG2xUS.js
var import_jsx_runtime = require_jsx_runtime();
function ReviewPage() {
	const { attemptId } = Route$3.useParams();
	const attempts = useSession((s) => s.attempts);
	const attempt = findAttempt(attempts, attemptId);
	if (!attempt) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Attempt not found"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "It may have been cleared or never saved on this device."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio/progress",
				className: "mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
				children: "Progress"
			})
		]
	});
	const kindLabel = attempt.kind === "jamb" ? "JAMB CBT" : attempt.kind === "waec" ? "WAEC paper" : "Topic quiz";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio/progress",
				className: "text-sm font-semibold text-primary",
				children: "← Progress"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-xs font-semibold text-primary",
				children: [kindLabel, attempt.demo ? " · DEMO" : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-display text-4xl",
				children: attempt.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-muted",
				children: [
					"Score ",
					attempt.score,
					"/",
					attempt.total,
					attempt.subjectLabel ? ` · ${attempt.subjectLabel}` : "",
					" · ",
					new Date(attempt.at).toLocaleString()
				]
			}),
			!attempt.items?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-muted",
				children: "This attempt was saved before answer snapshots were stored. Score is kept; item-level review is unavailable."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 space-y-4",
				children: attempt.items?.map((item, i) => {
					if (item.theory) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-2xl border border-dashed border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: ["Theory ", i + 1]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-medium",
								children: item.prompt
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 whitespace-pre-wrap text-sm",
								children: item.written?.trim() || "No response"
							}),
							item.modelAnswer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 rounded-xl bg-soft px-3 py-2 text-sm text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: "Demo model answer: "
								}), item.modelAnswer]
							})
						]
					}, item.id);
					const ok = item.answer != null && item.pick === item.answer;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-2xl border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: ["Q", i + 1]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-medium",
								children: item.prompt
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 flex items-center gap-2 text-sm",
								children: [
									item.answer != null ? ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 text-primary" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }) : null,
									"Your answer: ",
									item.pick ?? "—",
									item.answer != null ? ` · Key: ${item.answer}` : "",
									item.answerKeyStatus ? ` · ${keyLabel(item.answerKeyStatus)}` : ""
								]
							}),
							item.explain && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted",
								children: item.explain
							})
						]
					}, item.id);
				})
			})
		]
	});
}
//#endregion
export { ReviewPage as component };
