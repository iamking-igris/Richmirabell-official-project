import { w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/subjects-CNcQpMdN.js
var import_jsx_runtime = require_jsx_runtime();
function Subjects() {
	const subjects = useContent((s) => s.subjects);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "font-display text-4xl",
		children: "Subjects"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "mt-6 divide-y divide-line rounded-2xl border border-line bg-surface",
		children: subjects.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex justify-between px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium",
				children: s.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-sm text-muted",
				children: [s.topics.length, " topics"]
			})]
		}, s.id))
	})] });
}
//#endregion
export { Subjects as component };
