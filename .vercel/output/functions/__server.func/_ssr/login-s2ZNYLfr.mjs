import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { t as BrandMark } from "./brand-BEFfcJsS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-s2ZNYLfr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const navigate = useNavigate();
	const enter = useSession((s) => s.enter);
	const [error, setError] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-paper px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "w-full max-w-md rounded-3xl border border-line bg-surface p-8",
			onSubmit: (e) => {
				e.preventDefault();
				const data = new FormData(e.currentTarget);
				const email = String(data.get("email") || "").trim();
				const password = String(data.get("password") || "");
				if (!email.includes("@") || password.length < 6) {
					setError("Check your email and password.");
					return;
				}
				const name = email.split("@")[0] || "Student";
				enter(name.charAt(0).toUpperCase() + name.slice(1), email);
				const done = useSession.getState().onboardingComplete;
				navigate({ to: done ? "/studio" : "/onboarding" });
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-6 font-display text-3xl",
					children: "Welcome back"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Log in to continue Physics. Progress stays on this device."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-6 block text-sm font-medium",
					htmlFor: "email",
					children: "Email"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "email",
					name: "email",
					type: "email",
					required: true,
					autoComplete: "email",
					className: "mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary",
					placeholder: "ada@example.com"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-4 block text-sm font-medium",
					htmlFor: "password",
					children: "Password"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "password",
					name: "password",
					type: "password",
					required: true,
					autoComplete: "current-password",
					className: "mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 outline-none focus:border-primary",
					placeholder: "Your password"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-ink",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg",
					children: "Log in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-center text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/forgot-password",
							className: "text-muted",
							children: "Forgot password?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						"New here?",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/create-account",
							className: "font-medium text-primary",
							children: "Start free trial"
						})
					]
				})
			]
		})
	});
}
//#endregion
export { Login as component };
