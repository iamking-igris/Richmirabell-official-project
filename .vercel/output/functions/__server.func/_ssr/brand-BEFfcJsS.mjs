import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brand-BEFfcJsS.js
var import_jsx_runtime = require_jsx_runtime();
function BrandMark({ to = "/" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to,
		className: "flex items-center gap-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/logo.png",
			alt: "",
			width: 40,
			height: 44,
			className: "h-10 w-auto shrink-0"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-xl tracking-tight text-ink",
			children: "Richmirabel"
		})]
	});
}
//#endregion
export { BrandMark as t };
