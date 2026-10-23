import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, o as locateTopic, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, r as trialLeft } from "./session-BUK9M_Cu.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { m as Check, t as X } from "../_libs/lucide-react.mjs";
import { o as Route$4 } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/practice._id-9hVH0Ctu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEYS = [
	"A",
	"B",
	"C",
	"D"
];
function verdict(score, total) {
	const r = score / total;
	if (r === 1) return "Clean sweep.";
	if (r >= .75) return "Strong. One to review.";
	if (r >= .5) return "Half there. Read the note again.";
	return "Start with the note, then try again.";
}
function PracticePage() {
	const { id } = Route$4.useParams();
	const found = locateTopic(publishedSubjects(useContent((s) => s.subjects)), id);
	const record = useSession((s) => s.record);
	const trialStart = useSession((s) => s.trialStart);
	const subscribed = useSession((s) => s.subscribed);
	const open = trialLeft(trialStart, subscribed).active;
	const [index, setIndex] = (0, import_react.useState)(0);
	const [picks, setPicks] = (0, import_react.useState)({});
	const [done, setDone] = (0, import_react.useState)(false);
	const [confirming, setConfirming] = (0, import_react.useState)(false);
	const total = found?.topic.questions.length ?? 0;
	const score = (0, import_react.useMemo)(() => {
		if (!found) return 0;
		return found.topic.questions.filter((q) => q.answer != null && picks[q.id] === q.answer).length;
	}, [found, picks]);
	(0, import_react.useEffect)(() => {
		if (!found || done || !open) return;
		const qs = found.topic.questions;
		const onKey = (e) => {
			if (e.target?.tagName === "INPUT") return;
			const k = e.key.toUpperCase();
			const n = Number(e.key);
			const choice = KEYS.includes(k) ? k : n >= 1 && n <= 4 ? KEYS[n - 1] : null;
			if (choice) setPicks((p) => ({
				...p,
				[qs[index].id]: choice
			}));
			else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, qs.length - 1));
			else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		found,
		index,
		done,
		open
	]);
	if (!found) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "That set is not on Richmirabel." });
	const { subject, topic } = found;
	if (!open) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Your free days are over."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Practice needs a plan. Notes stay open."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/plan",
					className: "inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg",
					children: "See plan"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/topic/$id",
					params: { id: topic.id },
					className: "inline-flex min-h-11 items-center rounded-full border border-line px-5 font-semibold",
					children: "Back to the note"
				})]
			})
		]
	});
	function submit() {
		record({
			topicId: topic.id,
			title: topic.title,
			score,
			total,
			kind: "topic",
			demo: topic.origin === "demo",
			picks,
			subjectLabel: subject.name
		});
		setConfirming(false);
		setDone(true);
	}
	if (done) {
		const at = subject.topics.findIndex((t) => t.id === topic.id);
		const next = subject.topics[at + 1];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-primary",
					children: [
						subject.name,
						" · ",
						topic.title
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-1 font-display text-6xl",
					children: [
						score,
						"/",
						total
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-lg",
					children: verdict(score, total)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-6 space-y-3",
					children: topic.questions.map((question, i) => {
						const pick = picks[question.id];
						const correct = pick === question.answer;
						const text = (key) => question.options.find((o) => o.key === key)?.text;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-2xl border border-line bg-surface p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex items-center gap-2 text-sm font-semibold",
									children: [
										correct ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
											className: "size-4 text-primary",
											"aria-hidden": true
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
											className: "size-4",
											"aria-hidden": true
										}),
										"Question ",
										i + 1,
										" · ",
										correct ? "Correct" : pick ? "Incorrect" : "Not answered"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 font-medium",
									children: question.prompt
								}),
								!correct && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm",
									children: [
										pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											"You chose ",
											pick,
											": ",
											text(pick),
											". "
										] }) : null,
										"Answer: ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
											question.answer,
											": ",
											text(question.answer)
										] })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-muted",
									children: question.explain
								})
							]
						}, question.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-fg",
							onClick: () => {
								setDone(false);
								setIndex(0);
								setPicks({});
							},
							children: "Try again"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio/topic/$id",
							params: { id: topic.id },
							className: "inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 font-semibold",
							children: "Back to the note"
						}),
						next && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio/topic/$id",
							params: { id: next.id },
							className: "inline-flex min-h-11 items-center rounded-full border border-ink px-5 font-semibold",
							children: "Next topic"
						})
					]
				})
			]
		});
	}
	const question = topic.questions[index];
	const answered = topic.questions.filter((q) => picks[q.id]).length;
	const last = index === total - 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/topic/$id",
					params: { id: topic.id },
					className: "font-semibold text-primary",
					children: "Back to note"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "shrink-0",
					children: [
						"Question ",
						index + 1,
						" of ",
						total
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex gap-1.5",
				"aria-label": `${answered} of ${total} answered`,
				children: topic.questions.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": `Go to question ${i + 1}`,
					onClick: () => setIndex(i),
					className: cn("h-2 flex-1 rounded-full", i === index ? "bg-ink" : picks[q.id] ? "bg-primary" : "bg-soft")
				}, q.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-3xl leading-snug",
				children: question.prompt
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-5 space-y-2",
				role: "radiogroup",
				"aria-label": "Options",
				children: question.options.map((option) => {
					const selected = picks[question.id] === option.key;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "radio",
						"aria-checked": selected,
						onClick: () => setPicks((prev) => ({
							...prev,
							[question.id]: option.key
						})),
						className: cn("flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left", selected ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:border-ink"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", selected ? "border-primary-fg/60" : "border-line"),
							children: option.key
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: option.text })]
					}) }, option.key);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: index === 0,
					onClick: () => setIndex((n) => n - 1),
					className: "min-h-12 rounded-full border border-line px-5 disabled:opacity-40",
					children: "Previous"
				}), !last ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setIndex((n) => n + 1),
					className: "min-h-12 rounded-full bg-ink px-6 font-semibold text-primary-fg",
					children: "Next"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => answered < total ? setConfirming(true) : submit(),
					className: "min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg",
					children: "Submit"
				})]
			}),
			confirming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				role: "alertdialog",
				"aria-label": "Submit with unanswered questions",
				className: "fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-3xl bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-2xl",
							children: [total - answered, " unanswered."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Submit anyway? They count as wrong."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setConfirming(false),
								className: "min-h-12 flex-1 rounded-full border border-line font-semibold",
								children: "Keep answering"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: submit,
								className: "min-h-12 flex-1 rounded-full bg-primary font-semibold text-primary-fg",
								children: "Submit"
							})]
						})
					]
				})
			})
		]
	});
}
//#endregion
export { PracticePage as component };
