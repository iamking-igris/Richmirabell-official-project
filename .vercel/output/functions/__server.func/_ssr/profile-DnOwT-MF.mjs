import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, n as JAMB_OPTIONAL_IDS, s as publishedSubjects, t as AVAILABLE_SUBJECT_IDS } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as monthLabel } from "./format-44Ft2NgX.mjs";
import { t as monthOptions } from "./subject-picker-Vr0t_AXo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-DnOwT-MF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Profile() {
	const navigate = useNavigate();
	const subjects = publishedSubjects(useContent((s) => s.subjects));
	const exams = useSession((s) => s.exams);
	const jambSubjects = useSession((s) => s.jambSubjects);
	const examMonth = useSession((s) => s.examMonth);
	const update = useSession((s) => s.updateProfile);
	const [pickedExams, setPickedExams] = (0, import_react.useState)(exams.length ? exams : ["jamb"]);
	const [picked, setPicked] = (0, import_react.useState)(jambSubjects);
	const [month, setMonth] = (0, import_react.useState)(examMonth ?? "");
	const needsJamb = pickedExams.includes("jamb");
	const optional = JAMB_OPTIONAL_IDS.map((id) => subjects.find((s) => s.id === id)).filter((s) => Boolean(s));
	function toggleExam(exam) {
		setPickedExams((current) => current.includes(exam) ? current.filter((e) => e !== exam) : [...current, exam]);
	}
	function toggleSubject(id) {
		setPicked((current) => current.includes(id) ? current.filter((x) => x !== id) : current.length >= 3 ? current : [...current, id]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio",
				className: "inline-flex min-h-11 items-center text-sm font-semibold text-primary",
				children: "Back to dashboard"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-4xl",
				children: "Your plan"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Changing this does not delete your scores. Physics, Chemistry, Biology, and Mathematics are the open science subjects."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-8 font-display text-2xl",
				children: "Exams"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-2",
				children: ["waec", "jamb"].map((exam) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => toggleExam(exam),
					className: `min-h-20 rounded-2xl border p-4 text-left ${pickedExams.includes(exam) ? "border-primary bg-soft" : "border-line bg-surface"}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-xl uppercase",
						children: exam
					})
				}, exam))
			}),
			needsJamb && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-8 font-display text-2xl",
					children: "JAMB subjects"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Use of English is compulsory. Pick three more."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: optional.map((subject) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggleSubject(subject.id),
						className: `flex w-full min-h-14 items-center justify-between rounded-2xl border px-4 text-left ${picked.includes(subject.id) ? "border-primary bg-surface" : "border-line bg-surface"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-medium",
							children: subject.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: AVAILABLE_SUBJECT_IDS.has(subject.id) ? "Open now" : "In preparation"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm",
							children: picked.includes(subject.id) ? "Selected" : "Add"
						})]
					}) }, subject.id))
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-8 font-display text-2xl",
				children: "Exam month"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				value: month,
				onChange: (e) => setMonth(e.target.value),
				"aria-label": "Exam month",
				className: "mt-3 min-h-12 w-full rounded-xl border border-line bg-surface px-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Not set"
				}), [...month && !monthOptions().some((m) => m.value === month) ? [{
					value: month,
					label: monthLabel(month) || month
				}] : [], ...monthOptions()].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: m.value,
					children: m.label
				}, m.value))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: pickedExams.length === 0 || needsJamb && picked.length !== 3,
				onClick: () => {
					update({
						exams: pickedExams,
						jambSubjects: needsJamb ? picked : [],
						examMonth: month || null
					});
					navigate({ to: "/studio" });
				},
				className: "mt-8 min-h-12 rounded-full bg-primary px-8 text-sm font-semibold text-primary-fg disabled:opacity-40",
				children: "Save changes"
			})
		]
	});
}
//#endregion
export { Profile as component };
