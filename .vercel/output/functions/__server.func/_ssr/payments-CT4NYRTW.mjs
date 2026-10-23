import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as seedPayments } from "./seed-admin-AUzVamgg.mjs";
import { n as naira } from "./format-44Ft2NgX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/payments-CT4NYRTW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Payments() {
	const local = useSession((s) => s.payments);
	const payments = (0, import_react.useMemo)(() => [...local, ...seedPayments()].sort((a, b) => b.at - a.at), [local]);
	const ok = payments.filter((p) => p.status === "Successful");
	const failed = payments.length - ok.length;
	function exportCsv() {
		const header = "reference,student,amount,method,date,status";
		const lines = payments.map((p) => [
			p.reference,
			p.name,
			p.amount,
			p.method,
			new Date(p.at).toISOString(),
			p.status
		].join(","));
		const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "richmirabel-payments.csv";
		a.click();
		URL.revokeObjectURL(url);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Payments"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: exportCsv,
				className: "min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold",
				children: "Export CSV"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 grid grid-cols-3 gap-3",
			children: [
				[naira(ok.reduce((s, p) => s + p.amount, 0)), "this term"],
				[String(ok.length), "successful"],
				[String(failed), "failed"]
			].map(([n, d]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl sm:text-3xl",
					children: n
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: d
				})]
			}, d))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 overflow-x-auto rounded-2xl border border-line bg-surface",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[620px] text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "border-b border-line text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: [
						"Reference",
						"Student",
						"Amount",
						"Method",
						"Date",
						"Status"
					].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-4 py-3 font-medium",
						children: h
					}, h)) })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
					className: "divide-y divide-line",
					children: payments.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3 font-mono text-xs",
							children: p.reference
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: p.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: naira(p.amount)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: p.method
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: new Date(p.at).toLocaleDateString("en-NG", {
								day: "numeric",
								month: "short"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: p.status
						})
					] }, p.reference))
				})]
			})
		})
	] });
}
//#endregion
export { Payments as component };
