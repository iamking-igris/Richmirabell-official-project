import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { f as Eye, p as EyeOff } from "../_libs/lucide-react.mjs";
import { t as BrandMark } from "./brand-BEFfcJsS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/create-account-BDNHynr4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var empty = {
	name: "",
	email: "",
	password: "",
	confirm: ""
};
function validate(fields) {
	const errors = {};
	const name = fields.name.trim();
	if (name.length < 2 || name.length > 20) errors.name = "Enter your first name.";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = "Enter a valid email address.";
	if (fields.password.length < 8) errors.password = "Use at least 8 characters.";
	if (fields.password !== fields.confirm) errors.confirm = "Passwords do not match.";
	return errors;
}
function CreateAccount() {
	const navigate = useNavigate();
	const existing = useSession((s) => s.name);
	const enter = useSession((s) => s.enter);
	const [fields, setFields] = (0, import_react.useState)(empty);
	const [errors, setErrors] = (0, import_react.useState)({});
	const [show, setShow] = (0, import_react.useState)(false);
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [formError, setFormError] = (0, import_react.useState)("");
	function set(key, value) {
		setFields((current) => ({
			...current,
			[key]: value
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-line",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex h-16 max-w-6xl items-center justify-between px-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "text-sm text-muted hover:text-ink",
					children: "Back home"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl sm:text-5xl",
					children: "Create your account"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-md text-sm leading-relaxed text-muted",
					children: "Your progress is saved on this device. Next you choose WAEC, JAMB, or both, then Physics opens. Your two free days start after that."
				}),
				existing && status !== "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 border border-line bg-surface px-4 py-3 text-sm",
					children: [
						existing,
						" is already signed in on this device.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio",
							className: "font-semibold text-primary",
							children: "Continue learning"
						})
					]
				}),
				status === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 border border-line bg-surface p-6",
					role: "status",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-2xl",
							children: "Account ready."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Next, tell us which exam you are preparing for."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/studio",
							className: "mt-5 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg",
							children: "Continue learning"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-8 space-y-4",
					noValidate: true,
					onSubmit: (event) => {
						event.preventDefault();
						const next = validate(fields);
						setErrors(next);
						if (Object.keys(next).length > 0) {
							setStatus("error");
							setFormError("Check the fields below.");
							return;
						}
						if (existing) {
							navigate({ to: "/studio" });
							return;
						}
						setStatus("submitting");
						setFormError("");
						window.setTimeout(() => {
							enter(fields.name.trim(), fields.email.trim());
							navigate({ to: "/onboarding" });
						}, 400);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							id: "first-name",
							label: "First name",
							error: errors.name,
							value: fields.name,
							autoComplete: "given-name",
							onChange: (value) => set("name", value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							id: "email",
							label: "Email address",
							type: "email",
							error: errors.email,
							value: fields.email,
							autoComplete: "email",
							onChange: (value) => set("email", value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							id: "password",
							label: "Password",
							type: show ? "text" : "password",
							error: errors.password,
							value: fields.password,
							autoComplete: "new-password",
							onChange: (value) => set("password", value),
							toggle: {
								show,
								onToggle: () => setShow((v) => !v)
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							id: "confirm",
							label: "Confirm password",
							type: show ? "text" : "password",
							error: errors.confirm,
							value: fields.confirm,
							autoComplete: "new-password",
							onChange: (value) => set("confirm", value)
						}),
						formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-ink",
							role: "alert",
							children: formError
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: status === "submitting",
							className: "inline-flex min-h-11 w-full items-center justify-center bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60 sm:w-auto sm:px-8",
							children: status === "submitting" ? "Starting your trial…" : "Create account"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: ["Sign-in on another device is not available yet.", existing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/studio",
								className: "font-semibold text-primary",
								children: "Continue on this device"
							})] }) : null]
						})
					]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/media/atelier.jpg",
				alt: "An open green book and a brass compass on warm paper",
				className: "photo hidden aspect-[4/3] w-full object-cover lg:block"
			})]
		})]
	});
}
function Field({ id, label, value, onChange, error, type = "text", autoComplete, toggle }) {
	const errorId = `${id}-error`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "block text-sm font-medium",
			htmlFor: id,
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative mt-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				name: id,
				type,
				value,
				autoComplete,
				"aria-invalid": Boolean(error),
				"aria-describedby": error ? errorId : void 0,
				onChange: (event) => onChange(event.target.value),
				className: "w-full border border-line bg-surface px-3 py-3 outline-none focus:border-primary"
			}), toggle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center text-muted",
				"aria-pressed": toggle.show,
				"aria-label": toggle.show ? "Hide password" : "Show password",
				onClick: toggle.onToggle,
				children: toggle.show ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" })
			})]
		}),
		error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			id: errorId,
			className: "mt-1 text-sm text-ink",
			children: error
		})
	] });
}
//#endregion
export { CreateAccount as component };
