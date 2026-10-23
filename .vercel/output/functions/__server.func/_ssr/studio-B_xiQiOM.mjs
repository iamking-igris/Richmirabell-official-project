import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, r as trialLeft, t as bestByTopic } from "./session-BUK9M_Cu.mjs";
import { a as weeksUntil, i as plural, r as photoOf, t as monthLabel } from "./format-44Ft2NgX.mjs";
import { d as Flame, i as TrendingUp, o as Target, v as ArrowRight } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/studio-B_xiQiOM.js
var import_jsx_runtime = require_jsx_runtime();
/**
* What to study today.
* 1. The weakest topic under 60% comes back first.
* 2. Otherwise rotate subjects, least recently studied first, and open its first unsat topic.
*/
function nextTopic(mine, attempts) {
	const best = bestByTopic(attempts);
	const weak = mine.flatMap((subject) => subject.topics.map((topic) => ({
		subject,
		topic
	}))).filter((r) => best.has(r.topic.id)).map((r) => ({
		...r,
		ratio: best.get(r.topic.id).score / best.get(r.topic.id).total
	})).filter((r) => r.ratio < .6).sort((a, b) => a.ratio - b.ratio)[0];
	if (weak) return {
		subject: weak.subject,
		topic: weak.topic,
		reason: "Revisit",
		ratio: weak.ratio
	};
	const lastSat = (subject) => Math.max(0, ...attempts.filter((a) => subject.topics.some((t) => t.id === a.topicId)).map((a) => a.at));
	const order = [...mine].sort((a, b) => lastSat(a) - lastSat(b));
	for (const subject of order) {
		const topic = subject.topics.find((t) => !best.has(t.id));
		if (topic) return {
			subject,
			topic,
			reason: attempts.length ? "Next up" : "Start here"
		};
	}
	return null;
}
function studyDays(attempts) {
	return new Set(attempts.map((a) => new Date(a.at).toDateString())).size;
}
function greeting(name) {
	const hour = (/* @__PURE__ */ new Date()).getHours();
	return `Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${name}.`;
}
function Dashboard() {
	const all = publishedSubjects(useContent((s) => s.subjects));
	const name = useSession((s) => s.name);
	const exams = useSession((s) => s.exams);
	const examMonth = useSession((s) => s.examMonth);
	const attempts = useSession((s) => s.attempts);
	const trialStart = useSession((s) => s.trialStart);
	const subscribed = useSession((s) => s.subscribed);
	const trial = trialLeft(trialStart, subscribed);
	const best = bestByTopic(attempts);
	const mine = all;
	const rows = mine.flatMap((s) => s.topics);
	const finished = rows.filter((t) => best.has(t.id)).length;
	const ratios = [...best.entries()].filter(([id]) => rows.some((t) => t.id === id)).map(([, a]) => Math.round(a.score / a.total * 100));
	const average = ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null;
	const days = studyDays(attempts);
	const pick = nextTopic(mine, attempts);
	const weeks = weeksUntil(examMonth);
	const perWeek = weeks ? Math.max(1, Math.ceil((rows.length - finished) / weeks)) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl sm:text-5xl",
			children: greeting(name.split(" ")[0] || "there")
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 max-w-lg text-muted",
			children: [
				exams.length ? `Preparing for ${exams.map((e) => e.toUpperCase()).join(" and ")}. ` : "",
				"Physics, Chemistry, Biology, and Mathematics are open.",
				subscribed ? " Term access is active." : trial.active ? ` ${trial.label.replace(" left", "")} of free access left.` : " Your free days are over. Notes stay open."
			]
		}),
		pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/studio/topic/$id",
			params: { id: pick.topic.id },
			className: "card-lift relative mt-6 block overflow-hidden rounded-3xl text-primary-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: photoOf(pick.subject),
				alt: "",
				className: "photo absolute inset-0 h-full w-full object-cover"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative bg-ink/60 p-6 sm:p-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: pick.reason === "Revisit" ? "Revisit today" : pick.reason === "Next up" ? "Next up today" : "Start here"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl font-display text-3xl sm:text-4xl",
						children: pick.topic.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm",
						children: [
							pick.subject.name,
							" · ",
							pick.reason === "Revisit" && pick.ratio !== void 0 ? `You scored ${Math.round(pick.ratio * 100)}% last time` : `${pick.topic.minutes} min`
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold",
						children: ["Open note ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
							className: "size-4",
							"aria-hidden": true
						})]
					})
				]
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 rounded-3xl border border-line bg-surface p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-2xl",
				children: "You have finished every topic."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Retake your weakest from Scores to push the average up."
			})]
		}),
		weeks && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-4 text-sm text-muted",
			children: [
				monthLabel(examMonth),
				": ",
				plural(rows.length - finished, "topic"),
				" left, ",
				plural(weeks, "week"),
				" to go. About ",
				perWeek,
				" a week keeps you on track."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 grid grid-cols-3 gap-3",
			children: [
				[
					TrendingUp,
					`${finished}/${rows.length}`,
					"topics finished"
				],
				[
					Target,
					average === null ? "None yet" : `${average}%`,
					"average score"
				],
				[
					Flame,
					plural(days, "day"),
					"with a set sat"
				]
			].map(([Icon, n, d]) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-4 text-primary",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-display text-2xl sm:text-3xl",
							children: n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted sm:text-sm",
							children: d
						})
					]
				}, d);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-10 flex items-baseline justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-3xl",
				children: "Open subjects"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio/subjects",
				className: "min-h-11 text-sm font-semibold leading-[2.75rem] text-primary",
				children: "Browse subjects"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4",
			children: mine.map((subject) => {
				const done = subject.topics.filter((t) => best.has(t.id)).length;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "h-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/studio/subject/$id",
						params: { id: subject.id },
						className: "card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: photoOf(subject),
							alt: "",
							className: "photo aspect-[16/10] w-full object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-1 flex-col p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold text-primary",
									children: "Available now"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-display text-xl leading-tight",
									children: subject.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-sm text-muted",
									children: [
										done,
										" of ",
										subject.topics.length,
										" finished"
									]
								})
							]
						})]
					})
				}, subject.id);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-10 font-display text-3xl",
			children: "Practice modes"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 grid gap-3 md:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/subjects",
					className: "rounded-2xl border border-line bg-surface p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold text-primary",
							children: "Open"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-1 font-display text-xl",
							children: "Topic quizzes"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Short sets across Physics, Chemistry, Biology, and Mathematics."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/cbt",
					className: "rounded-2xl border border-line bg-surface p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold text-primary",
							children: "Open"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-1 font-display text-xl",
							children: "WAEC past papers"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Synthetic WAEC-style papers are available in the demo workflow."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/cbt",
					className: "rounded-2xl border border-line bg-surface p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold text-primary",
							children: "Open"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-1 font-display text-xl",
							children: "JAMB CBT"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "The demo full-paper CBT is ready for the standard four-subject format."
						})
					]
				})
			]
		})
	] });
}
//#endregion
export { Dashboard as component };
