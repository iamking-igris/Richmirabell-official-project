import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, r as availableSubjects } from "./content-Bo1Mw7-U.mjs";
import { r as photoOf } from "./format-44Ft2NgX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/subjects-CBjPvykz.js
var import_jsx_runtime = require_jsx_runtime();
function SubjectsPage() {
	const subjects = availableSubjects(useContent((s) => s.subjects));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-5xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Subjects"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "All subject folders are open in demo mode, with notes and practice sets loaded for inspection."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3",
				children: subjects.map((subject) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/studio/subject/$id",
					params: { id: subject.id },
					className: "flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: photoOf(subject),
						alt: "",
						className: "h-28 w-28 object-cover sm:h-32 sm:w-36"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex flex-col justify-center py-3 pr-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-primary",
								children: "Available now"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-2xl",
								children: subject.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 text-sm text-muted",
								children: [subject.topics.length, " topics · Open notes and quizzes"]
							})
						]
					})]
				}, subject.id))
			})
		]
	});
}
//#endregion
export { SubjectsPage as component };
