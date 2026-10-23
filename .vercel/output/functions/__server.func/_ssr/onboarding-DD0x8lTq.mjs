import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime, x as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, n as JAMB_OPTIONAL_IDS, s as publishedSubjects, t as AVAILABLE_SUBJECT_IDS } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as monthLabel } from "./format-44Ft2NgX.mjs";
import { t as BrandMark } from "./brand-BEFfcJsS.mjs";
import { t as monthOptions } from "./subject-picker-Vr0t_AXo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-DD0x8lTq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Onboarding() {
	const navigate = useNavigate();
	const name = useSession((s) => s.name);
	const done = useSession((s) => s.onboardingComplete);
	const complete = useSession((s) => s.completeOnboarding);
	const subjects = publishedSubjects(useContent((s) => s.subjects));
	const [step, setStep] = (0, import_react.useState)(0);
	const [exams, setExams] = (0, import_react.useState)(["jamb"]);
	const [picked, setPicked] = (0, import_react.useState)([]);
	const [month, setMonth] = (0, import_react.useState)(null);
	const [unsure, setUnsure] = (0, import_react.useState)(true);
	if (!name) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/create-account" });
	if (done) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/studio" });
	const first = name.split(" ")[0];
	const needsJamb = exams.includes("jamb");
	const steps = needsJamb ? [
		"Exams",
		"JAMB subjects",
		"Exam date",
		"Ready"
	] : [
		"Exams",
		"Exam date",
		"Ready"
	];
	const months = monthOptions();
	const optional = JAMB_OPTIONAL_IDS.map((id) => subjects.find((s) => s.id === id)).filter((s) => Boolean(s));
	function toggleExam(exam) {
		setExams((current) => current.includes(exam) ? current.filter((e) => e !== exam) : [...current, exam]);
	}
	function toggleSubject(id) {
		setPicked((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length >= 3 ? current : [...current, id]);
	}
	function finish() {
		complete({
			exams,
			jambSubjects: needsJamb ? picked : [],
			examMonth: unsure ? null : month
		});
		navigate({ to: "/studio" });
	}
	const dateStep = needsJamb ? 2 : 1;
	const reviewStep = needsJamb ? 3 : 2;
	const canContinue = step === 0 ? exams.length > 0 : step === 1 && needsJamb ? picked.length === 3 : true;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-b border-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-16 max-w-2xl items-center justify-between px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm text-muted",
						children: [
							"Step ",
							step + 1,
							" of ",
							steps.length
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 bg-soft",
					role: "progressbar",
					"aria-valuemin": 1,
					"aria-valuemax": steps.length,
					"aria-valuenow": step + 1,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-primary transition-all",
						style: { width: `${(step + 1) / steps.length * 100}%` }
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-2xl px-4 py-10 pb-28",
				children: [
					step === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "font-display text-4xl",
							children: [
								"What are you preparing for, ",
								first,
								"?"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-muted",
							children: "Pick WAEC, JAMB, or both. The demo subject bank is open across the catalog."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 grid gap-3 sm:grid-cols-2",
							children: ["waec", "jamb"].map((exam) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => toggleExam(exam),
								className: `min-h-24 rounded-2xl border p-5 text-left ${exams.includes(exam) ? "border-primary bg-surface ring-2 ring-primary" : "border-line bg-surface"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display text-2xl uppercase",
									children: exam
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-sm text-muted",
									children: exam === "waec" ? "Science subjects as they are ready" : "Use of English plus three subjects"
								})]
							}, exam))
						})
					] }),
					needsJamb && step === 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl",
							children: "Your JAMB combination"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-muted",
							children: "Use of English is compulsory. Pick three more. The demo notes and quizzes are available across the subject set."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 rounded-2xl border border-primary bg-soft p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: "Use of English"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Compulsory. Notes are still being prepared."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-2",
							children: optional.map((subject) => {
								const on = picked.includes(subject.id);
								const ready = AVAILABLE_SUBJECT_IDS.has(subject.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleSubject(subject.id),
									className: `flex w-full min-h-14 items-center justify-between rounded-2xl border px-4 text-left ${on ? "border-primary bg-surface" : "border-line bg-surface"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block font-medium",
										children: subject.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-muted",
										children: ready ? "Open now" : "In preparation"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm",
										children: on ? "Selected" : "Add"
									})]
								}) }, subject.id);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-muted",
							children: [picked.length, " of 3 selected."]
						})
					] }),
					step === dateStep && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl",
							children: "When is your exam?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-muted",
							children: "Optional. Skip this if you are not sure yet."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "mt-8 block text-sm font-medium",
							htmlFor: "month",
							children: "Exam month"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "month",
							disabled: unsure,
							value: month ?? "",
							onChange: (e) => setMonth(e.target.value || null),
							className: "mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-3 disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Choose a month"
							}), months.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: m.value,
								children: m.label
							}, m.value))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-4 flex min-h-11 items-center gap-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: unsure,
								onChange: (e) => setUnsure(e.target.checked),
								className: "size-5 accent-[var(--color-primary)]"
							}), "I'm not sure yet"]
						})
					] }),
					step === reviewStep && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "font-display text-4xl",
							children: [
								"You're set, ",
								first,
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 rounded-2xl border border-line bg-surface p-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "space-y-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "Exams"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "font-medium",
											children: exams.map((e) => e.toUpperCase()).join(" and ")
										})]
									}),
									needsJamb && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "JAMB subjects"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
											className: "text-right font-medium",
											children: ["English, ", picked.map((id) => subjects.find((s) => s.id === id)?.name ?? id).join(", ")]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "Open now"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "font-medium",
											children: "Physics, Chemistry, Biology, and Mathematics"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "Exam date"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "font-medium",
											children: unsure || !month ? "Not set" : monthLabel(month)
										})]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm text-muted",
							children: "Demo JAMB CBT and WAEC past-paper flows are enabled, with the practice bank loaded across all subjects."
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3",
					children: [step > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setStep(step - 1),
						className: "min-h-12 rounded-full border border-line px-6 text-sm font-semibold",
						children: "Back"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "min-h-12 px-2 text-sm leading-[3rem] text-muted",
						children: "Cancel"
					}), step < reviewStep ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !canContinue,
						onClick: () => setStep(step + 1),
						className: "min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg disabled:opacity-40",
						children: "Continue"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: finish,
						className: "min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg",
						children: "Open my dashboard"
					})]
				})
			})
		]
	});
}
//#endregion
export { Onboarding as component };
