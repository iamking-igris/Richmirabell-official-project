import { S as useNavigate, b as Link, g as Outlet, p as useRouterState, w as require_jsx_runtime, x as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useSession, r as trialLeft } from "./session-BUK9M_Cu.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { c as PenLine, g as BookOpen, h as ChartColumn, n as UserRound, u as House } from "../_libs/lucide-react.mjs";
import { t as BrandMark } from "./brand-BEFfcJsS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/studio-BOlbhUvj.js
var import_jsx_runtime = require_jsx_runtime();
var links = [
	{
		to: "/studio",
		label: "Home",
		icon: House,
		exact: true
	},
	{
		to: "/studio/progress",
		label: "Progress",
		icon: ChartColumn,
		exact: false
	},
	{
		to: "/studio/cbt",
		label: "Take CBT",
		icon: PenLine,
		exact: false,
		center: true
	},
	{
		to: "/studio/guides",
		label: "Guides",
		icon: BookOpen,
		exact: false
	},
	{
		to: "/studio/account",
		label: "Account",
		icon: UserRound,
		exact: false
	}
];
function Shell({ children }) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const name = useSession((s) => s.name);
	const leave = useSession((s) => s.leave);
	const trialStart = useSession((s) => s.trialStart);
	const subscribed = useSession((s) => s.subscribed);
	const navigate = useNavigate();
	const trial = trialLeft(trialStart, subscribed);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, { to: "/studio" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "hidden items-center gap-1 md:flex",
							children: links.map((item) => {
								const active = item.exact ? path === item.to : path.startsWith(item.to);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: item.to,
									className: cn("min-h-11 border-b-2 px-3 py-2.5 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"),
									children: item.label
								}, item.to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("rounded-full px-3 py-1", subscribed ? "bg-soft text-primary" : trial.active ? "bg-soft text-ink" : "border border-ink text-ink"),
									children: trial.label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio/profile",
									className: "hidden min-h-11 items-center font-medium hover:text-primary sm:inline-flex",
									children: name.split(" ")[0]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										leave();
										navigate({ to: "/" });
									},
									className: "min-h-11 rounded-full px-3 text-sm text-muted hover:text-ink",
									children: "Log out"
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:pb-10",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid grid-cols-5",
					children: links.map((item) => {
						const active = item.exact ? path === item.to : path.startsWith(item.to);
						const Icon = item.icon;
						const center = "center" in item && item.center;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: cn("flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs", active ? "text-primary" : "text-muted", center && "-mt-3"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("flex size-10 items-center justify-center rounded-full", center ? "bg-primary text-primary-fg shadow-sm" : ""),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									className: "size-5",
									strokeWidth: 1.75
								})
							}), item.label]
						}) }, item.to);
					})
				})
			})
		]
	});
}
function Gate({ children }) {
	const name = useSession((s) => s.name);
	const complete = useSession((s) => s.onboardingComplete);
	const navigate = useNavigate();
	if (!name) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-paper px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-primary",
					children: "Richmirabel"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-3xl",
					children: "Sign in to continue"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Physics, Chemistry, Biology, and Mathematics are open. Your two free days start after a short setup."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => navigate({ to: "/create-account" }),
						className: "w-full rounded-full bg-primary py-3 font-semibold text-primary-fg",
						children: "Start free trial"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => navigate({ to: "/login" }),
						className: "w-full rounded-full border border-line py-3 font-semibold",
						children: "Log in"
					})]
				})
			]
		})
	});
	if (!complete) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/onboarding" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, { children });
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
//#endregion
export { SplitComponent as component };
