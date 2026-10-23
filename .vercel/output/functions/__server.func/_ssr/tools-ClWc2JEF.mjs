import { w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tools-ClWc2JEF.js
var import_jsx_runtime = require_jsx_runtime();
function Tools() {
	const resetTrial = useSession((s) => s.resetTrial);
	const leave = useSession((s) => s.leave);
	const resetContent = useContent((s) => s.resetContent);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Device tools"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "These only change this browser."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "rounded-full border border-line bg-surface px-4 py-3 text-left",
						onClick: () => resetTrial(),
						children: "Preview trial ended"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "rounded-full border border-line bg-surface px-4 py-3 text-left",
						onClick: () => leave(),
						children: "Reset this device"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "rounded-full border border-line bg-surface px-4 py-3 text-left",
						onClick: () => {
							if (confirm("Replace every note and question with the original set?")) resetContent();
						},
						children: "Reset content to defaults"
					})
				]
			})
		]
	});
}
//#endregion
export { Tools as component };
