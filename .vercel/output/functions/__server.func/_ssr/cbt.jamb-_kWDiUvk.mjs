import { i as __toESM } from "../_runtime.mjs";
import { r as demoJambPaper, t as buildJambPaper } from "./jamb-2_7p5r08.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { r as scoreObjective } from "./assessment-BvX2l6XN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cbt.jamb-_kWDiUvk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatTime(sec) {
	return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
}
function JambCbtPage() {
	const demoMode = useSession((s) => s.demoMode);
	const record = useSession((s) => s.record);
	const jambSubjects = useSession((s) => s.jambSubjects);
	const navigate = useNavigate();
	const [started, setStarted] = (0, import_react.useState)(false);
	const [done, setDone] = (0, import_react.useState)(false);
	const [index, setIndex] = (0, import_react.useState)(0);
	const [picks, setPicks] = (0, import_react.useState)({});
	const [flagged, setFlagged] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [left, setLeft] = (0, import_react.useState)(demoJambPaper.timerSeconds);
	const [attemptId, setAttemptId] = (0, import_react.useState)(null);
	const submitted = (0, import_react.useRef)(false);
	const endsAt = (0, import_react.useRef)(null);
	const subjectFilter = (0, import_react.useMemo)(() => {
		return ["english", ...(jambSubjects.length === 3 ? jambSubjects : [
			"physics",
			"mathematics",
			"chemistry"
		]).map((s) => s.toLowerCase())];
	}, [jambSubjects]);
	const questions = (0, import_react.useMemo)(() => buildJambPaper(subjectFilter), [subjectFilter]);
	const { score, total } = (0, import_react.useMemo)(() => scoreObjective(questions, picks), [questions, picks]);
	(0, import_react.useEffect)(() => {
		if (!started || done) return;
		if (!endsAt.current) endsAt.current = Date.now() + demoJambPaper.timerSeconds * 1e3;
		const tick = () => {
			const rem = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1e3));
			setLeft(rem);
			if (rem <= 0) submit();
		};
		tick();
		const id = window.setInterval(tick, 500);
		return () => window.clearInterval(id);
	}, [started, done]);
	const submit = () => {
		if (submitted.current) return;
		submitted.current = true;
		const items = questions.map((q) => ({
			id: q.id,
			prompt: q.prompt,
			options: q.options,
			answer: q.answer,
			explain: q.explain,
			answerKeyStatus: q.answerKeyStatus,
			pick: picks[q.id]
		}));
		const id = record({
			topicId: demoJambPaper.id,
			title: demoJambPaper.title,
			score,
			total,
			kind: "jamb",
			demo: true,
			picks,
			items,
			paperId: demoJambPaper.id,
			subjectLabel: "JAMB CBT demo"
		});
		setAttemptId(id);
		setDone(true);
	};
	if (!demoMode) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Demo mode off"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Enable Demo mode in Account to run the synthetic JAMB CBT."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio/account",
				className: "mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
				children: "Account"
			})
		]
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
				children: demoJambPaper.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl",
				children: demoJambPaper.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-4 list-disc space-y-1 pl-5 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						questions.length,
						" synthetic questions across ",
						subjectFilter.length,
						" subjects"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Timer: ",
						Math.round(demoJambPaper.timerSeconds / 60),
						" minutes (auto-submits)"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Flag questions; navigate by number" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Not an official JAMB paper — for product testing only" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					endsAt.current = Date.now() + demoJambPaper.timerSeconds * 1e3;
					setStarted(true);
				},
				className: "mt-6 min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg",
				children: "Start session"
			})
		]
	});
	if (done) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold text-primary",
				children: "Demo JAMB result"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-1 font-display text-4xl",
				children: [
					score,
					"/",
					total
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Synthetic answer keys only. This is not an official score."
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
					children: "Review answers"
				})]
			})
		]
	});
	const q = questions[index];
	if (!q) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-primary",
					children: "Demo JAMB CBT"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `rounded-full px-3 py-1 text-sm font-semibold ${left < 60 ? "bg-ink text-primary-fg" : "bg-soft"}`,
					children: formatTime(left)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					"Q",
					index + 1,
					"/",
					questions.length,
					" · ",
					q.subjectId,
					" · DEMO"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-1",
				children: questions.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setIndex(i),
					className: cn("size-8 rounded text-xs font-semibold", i === index ? "bg-primary text-primary-fg" : picks[item.id] ? "bg-soft" : "border border-line", flagged.has(item.id) && "ring-2 ring-brass"),
					children: i + 1
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-2xl leading-snug",
				children: q.prompt
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
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
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap items-center justify-between gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: index === 0,
						onClick: () => setIndex((i) => i - 1),
						className: "min-h-11 rounded-full border border-line px-4 disabled:opacity-40",
						children: "Previous"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setFlagged((f) => {
							const n = new Set(f);
							if (n.has(q.id)) n.delete(q.id);
							else n.add(q.id);
							return n;
						}),
						className: "min-h-11 rounded-full border border-line px-4 text-sm",
						children: flagged.has(q.id) ? "Unflag" : "Flag"
					}),
					index < questions.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setIndex((i) => i + 1),
						className: "min-h-11 rounded-full bg-ink px-5 font-semibold text-primary-fg",
						children: "Next"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: submit,
						className: "min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg",
						children: "Submit paper"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					if (window.confirm("Leave this demo session?")) navigate({ to: "/studio/cbt" });
				},
				className: "mt-4 text-sm text-muted underline",
				children: "Exit without saving"
			})
		]
	});
}
//#endregion
export { JambCbtPage as component };
