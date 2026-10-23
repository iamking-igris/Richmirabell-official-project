import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession, r as trialLeft } from "./session-BUK9M_Cu.mjs";
import { m as Check } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plan-5arBVFGr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var provider = { async checkout() {
	await new Promise((r) => setTimeout(r, 1400));
	return {
		ok: true,
		reference: "RM-" + Date.now().toString(36).toUpperCase()
	};
} };
var TERM_PRICE = 4500;
function PlanPage() {
	const navigate = useNavigate();
	const name = useSession((s) => s.name);
	const subscribed = useSession((s) => s.subscribed);
	const trialStart = useSession((s) => s.trialStart);
	const subscribe = useSession((s) => s.subscribe);
	const addPayment = useSession((s) => s.addPayment);
	const trial = trialLeft(trialStart, subscribed);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [method, setMethod] = (0, import_react.useState)("Card");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [receipt, setReceipt] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	async function pay() {
		setBusy(true);
		setError("");
		const result = await provider.checkout({
			name,
			amount: TERM_PRICE,
			method
		});
		setBusy(false);
		if (!result.ok) {
			setError("Payment didn't go through. You were not charged. Try again.");
			return;
		}
		addPayment({
			reference: result.reference,
			name,
			amount: TERM_PRICE,
			method,
			at: Date.now(),
			status: "Successful"
		});
		subscribe();
		setReceipt(result.reference);
		setOpen(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Plan"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: subscribed ? "Term access is active." : trial.active ? `${trial.label} of free access.` : "Your free days are over. Notes stay open. Practice needs a plan."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "mt-6 rounded-3xl bg-ink p-6 text-primary-fg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-brass",
						children: "Term access"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-display text-5xl",
						children: "₦4,500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm",
						children: "One term, every topic, every set."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-2 text-sm",
						children: [
							"All subjects",
							"All practice sets",
							"Mark guides",
							"Progress tracking"
						].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4 text-brass" }),
								" ",
								item
							]
						}, item))
					}),
					!subscribed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setOpen(true),
						className: "mt-6 w-full rounded-full bg-primary py-3 font-semibold",
						children: "Pay ₦4,500"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-muted",
				children: "Pay with card, bank transfer or USSD. Questions? hello@richmirabel.com"
			}),
			receipt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl",
						children: "Payment received"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm",
						children: [
							"Reference ",
							receipt,
							" · ₦4,500"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => navigate({ to: "/studio" }),
						className: "mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg",
						children: "Start practising"
					})
				]
			}),
			open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-md rounded-3xl bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-3xl",
							children: "₦4,500"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid grid-cols-3 gap-2",
							children: [
								"Card",
								"Bank transfer",
								"USSD"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setMethod(item),
								className: `rounded-xl border px-2 py-3 text-sm ${method === item ? "border-primary bg-soft" : "border-line"}`,
								children: item
							}, item))
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: pay,
							className: "mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-fg disabled:opacity-60",
							children: busy ? "Confirming payment…" : "Pay ₦4,500"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setOpen(false),
							className: "mt-2 w-full py-3 text-sm",
							children: "Close"
						})
					]
				})
			})
		]
	});
}
//#endregion
export { PlanPage as component };
