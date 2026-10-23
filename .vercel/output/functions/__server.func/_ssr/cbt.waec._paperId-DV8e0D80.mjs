import { i as __toESM } from "../_runtime.mjs";
import { n as findWaecPaper } from "./waec-BnOIvMdY.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { r as scoreObjective } from "./assessment-BvX2l6XN.mjs";
import { n as Route } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cbt.waec._paperId-DV8e0D80.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatTime(sec) {
	return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
}
function WaecPaperPage() {
	const { paperId } = Route.useParams();
	const paper = findWaecPaper(paperId);
	const demoMode = useSession((s) => s.demoMode);
	const record = useSession((s) => s.record);
	const [started, setStarted] = (0, import_react.useState)(false);
	const [done, setDone] = (0, import_react.useState)(false);
	const [index, setIndex] = (0, import_react.useState)(0);
	const [picks, setPicks] = (0, import_react.useState)({});
	const [written, setWritten] = (0, import_react.useState)({});
	const [left, setLeft] = (0, import_react.useState)(paper?.timerSeconds ?? 0);
	const [attemptId, setAttemptId] = (0, import_react.useState)(null);
	const submitted = (0, import_react.useRef)(false);
	const endsAt = (0, import_react.useRef)(null);
	const objectives = paper?.objectives ?? [];
	const theory = paper?.theory ?? [];
	const totalSteps = objectives.length + theory.length;
	const { score, total } = (0, import_react.useMemo)(() => scoreObjective(objectives, picks), [objectives, picks]);
	(0, import_react.useEffect)(() => {
		if (!started || done || !paper) return;
		if (!endsAt.current) endsAt.current = Date.now() + paper.timerSeconds * 1e3;
		const tick = () => {
			const rem = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1e3));
			setLeft(rem);
			if (rem <= 0) submit();
		};
		tick();
		const id = window.setInterval(tick, 500);
		return () => window.clearInterval(id);
	}, [
		started,
		done,
		paper
	]);
	const submit = () => {
		if (submitted.current || !paper) return;
		submitted.current = true;
		const items = [...objectives.map((q) => ({
			id: q.id,
			prompt: q.prompt,
			options: q.options,
			answer: q.answer,
			explain: q.explain,
			answerKeyStatus: q.answerKeyStatus,
			pick: picks[q.id]
		})), ...theory.map((t) => ({
			id: t.id,
			prompt: t.prompt,
			theory: true,
			written: written[t.id],
			modelAnswer: t.modelAnswer
		}))];
		const id = record({
			topicId: paper.id,
			title: paper.title,
			score,
			total,
			kind: "waec",
			demo: true,
			picks,
			written,
			items,
			paperId: paper.id,
			subjectLabel: paper.subjectName
		});
		setAttemptId(id);
		setDone(true);
	};
	if (!paper) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Paper not found"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/studio/cbt",
			className: "mt-4 inline-flex text-sm font-semibold text-primary",
			children: "Back to Take CBT"
		})]
	});
	if (!demoMode) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Demo mode off"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/studio/account",
			className: "mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
			children: "Account"
		})]
	});
	if (!started) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio/cbt",
				className: "text-sm font-semibold text-primary",
				children: "← Take CBT"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 rounded-xl bg-soft px-3 py-2 text-sm font-medium text-muted",
				children: paper.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl",
				children: paper.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					paper.subjectName,
					" · ",
					paper.component,
					" · ",
					objectives.length,
					" objective · ",
					theory.length,
					" theory · ",
					Math.round(paper.timerSeconds / 60),
					" min"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					endsAt.current = Date.now() + paper.timerSeconds * 1e3;
					setStarted(true);
				},
				className: "mt-6 min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg",
				children: "Start paper"
			})
		]
	});
	if (done) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold text-primary",
				children: "Demo WAEC result"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-display text-4xl",
				children: total > 0 ? `${score}/${total}` : "Theory saved"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Objective items marked with demo keys only. Theory is not auto-marked."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/progress",
					className: "inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold",
					children: "Progress"
				}), attemptId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/review/$attemptId",
					params: { attemptId },
					className: "inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
					children: "Review"
				})]
			})
		]
	});
	const onObj = index < objectives.length;
	const q = onObj ? objectives[index] : null;
	const tq = !onObj ? theory[index - objectives.length] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-primary",
					children: "Demo WAEC"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-full bg-soft px-3 py-1 text-sm font-semibold",
					children: formatTime(left)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: onObj ? `Objective ${index + 1}/${objectives.length}` : `Theory ${index - objectives.length + 1}/${theory.length}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-1",
				children: Array.from({ length: totalSteps }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setIndex(i),
					className: cn("size-8 rounded text-xs font-semibold", i === index ? "bg-primary text-primary-fg" : "border border-line"),
					children: i + 1
				}, i))
			}),
			q && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-2xl leading-snug",
				children: q.prompt
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-5 space-y-2",
				children: q.options.map((opt) => {
					const selected = picks[q.id] === opt.key;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setPicks((p) => ({
							...p,
							[q.id]: opt.key
						})),
						className: cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left", selected ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
							children: opt.key
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: opt.text })]
					}) }, opt.key);
				})
			})] }),
			tq && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-2xl leading-snug",
				children: tq.prompt
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				value: written[tq.id] ?? "",
				onChange: (e) => setWritten((w) => ({
					...w,
					[tq.id]: e.target.value
				})),
				rows: 7,
				className: "mt-4 w-full rounded-2xl border border-line bg-surface px-4 py-3 outline-none focus:border-primary",
				placeholder: "Write your answer…"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: index === 0,
					onClick: () => setIndex((i) => i - 1),
					className: "min-h-11 rounded-full border border-line px-4 disabled:opacity-40",
					children: "Previous"
				}), index < totalSteps - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setIndex((i) => i + 1),
					className: "min-h-11 rounded-full bg-ink px-5 font-semibold text-primary-fg",
					children: "Next"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: submit,
					className: "min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg",
					children: "Submit paper"
				})]
			})
		]
	});
}
//#endregion
export { WaecPaperPage as component };
