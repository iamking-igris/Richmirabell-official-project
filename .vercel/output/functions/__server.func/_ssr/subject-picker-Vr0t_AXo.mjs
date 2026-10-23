import "../_runtime.mjs";
import { Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
require_react();
require_jsx_runtime();
function monthOptions() {
	const out = [];
	const now = /* @__PURE__ */ new Date();
	for (let i = 1; i <= 14; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
		out.push({
			value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
			label: d.toLocaleDateString("en-NG", {
				month: "long",
				year: "numeric"
			})
		});
	}
	return out;
}
//#endregion
export { monthOptions as t };
