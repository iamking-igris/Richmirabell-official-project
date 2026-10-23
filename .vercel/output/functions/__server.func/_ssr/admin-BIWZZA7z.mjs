import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, g as Outlet, p as useRouterState, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BIWZZA7z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var links = [
	["/admin", "Overview"],
	["/admin/subjects", "Subjects"],
	["/admin/topics", "Topics"],
	["/admin/students", "Students"],
	["/admin/payments", "Payments"],
	["/admin/briefings", "Briefings"],
	["/admin/tools", "Tools"]
];
function AdminGate() {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const [ok, setOk] = (0, import_react.useState)(() => typeof sessionStorage !== "undefined" && sessionStorage.getItem("richmirabel-admin") === "1");
	const [error, setError] = (0, import_react.useState)("");
	if (!ok) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "mx-auto mt-24 max-w-sm rounded-3xl border border-line bg-surface p-6",
		onSubmit: (e) => {
			e.preventDefault();
			if (String(new FormData(e.currentTarget).get("code") || "") !== "richmirabel") {
				setError("That passcode is not right.");
				return;
			}
			sessionStorage.setItem("richmirabel-admin", "1");
			setOk(true);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Teacher sign in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "mt-4 block text-sm",
				htmlFor: "code",
				children: "Passcode"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "code",
				name: "code",
				type: "password",
				className: "mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3"
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg",
				children: "Sign in"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden bg-ink p-5 text-primary-fg md:block",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl",
					children: "Richmirabel"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-primary-fg/60",
					children: "Teacher view"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "mt-8 space-y-1",
					children: links.map(([to, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to,
						className: cn("block min-h-11 border-l-2 px-3 py-2.5 text-sm", path === to ? "border-brass text-primary-fg" : "border-transparent text-primary-fg/70 hover:text-primary-fg"),
						children: label
					}, to))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-8 text-sm text-primary-fg/70",
					onClick: () => {
						sessionStorage.removeItem("richmirabel-admin");
						setOk(false);
					},
					children: "Sign out"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden",
			children: links.map(([to, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to,
				className: cn("inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm", path === to ? "bg-ink text-primary-fg" : "bg-soft"),
				children: label
			}, to))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
			className: "mx-auto max-w-6xl px-4 py-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
		})] })]
	});
}
//#endregion
export { AdminGate as component };
