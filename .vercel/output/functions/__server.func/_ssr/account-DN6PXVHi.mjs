import { S as useNavigate, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, i as demoInventory } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/account-DN6PXVHi.js
var import_jsx_runtime = require_jsx_runtime();
function AccountPage() {
	const navigate = useNavigate();
	const name = useSession((s) => s.name);
	const email = useSession((s) => s.email);
	const exams = useSession((s) => s.exams);
	const jamb = useSession((s) => s.jambSubjects);
	const demoMode = useSession((s) => s.demoMode);
	const setDemoMode = useSession((s) => s.setDemoMode);
	const clearDemoAttempts = useSession((s) => s.clearDemoAttempts);
	const clearAllAttempts = useSession((s) => s.clearAllAttempts);
	const leave = useSession((s) => s.leave);
	const resetContent = useContent((s) => s.resetContent);
	const inv = demoInventory();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Account"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-muted",
				children: [name || "Student", email ? ` · ${email}` : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/studio/profile",
						className: "flex min-h-14 items-center justify-between px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-medium",
							children: "Profile and exams"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: exams.map((e) => e.toUpperCase()).join(" and ") || "Exams not set"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-primary",
							children: "Edit"
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "px-4 py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: "JAMB subjects"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: jamb.length === 3 ? `English, ${jamb.join(", ")}` : "Not set"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/studio/profile",
								className: "mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary",
								children: "Change combination"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/studio/plan",
						className: "flex min-h-14 items-center justify-between px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-medium",
							children: "Access"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: "Trial and term access. Payment is simulated on this device."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-primary",
							children: "Open"
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: "Security"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Passwords are not saved on a server. This is a local demo on this device."
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8 rounded-2xl border border-dashed border-line bg-surface p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Demo / test controls"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Demo mode shows synthetic Physics subtopics, JAMB and WAEC papers for UI testing. They are labelled DEMO and are not teacher-approved content. No real payments or backend calls."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-4 flex min-h-12 items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: demoMode,
							onChange: (e) => setDemoMode(e.target.checked),
							className: "size-5"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm font-medium",
							children: ["Demo mode ", demoMode ? "on" : "off"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs text-muted",
						children: [
							"Seed inventory: ",
							inv.physicsDemoTopics,
							" Physics demo topics · ",
							inv.physicsDemoMcq,
							" MCQ · ",
							inv.physicsDemoTheory,
							" theory · JAMB bank ",
							inv.jambBank,
							" · WAEC papers ",
							inv.waecPapers
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => clearDemoAttempts(),
								className: "min-h-11 rounded-full border border-line px-4 text-sm font-semibold",
								children: "Clear demo attempts"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									if (window.confirm("Clear all attempts on this device?")) clearAllAttempts();
								},
								className: "min-h-11 rounded-full border border-line px-4 text-sm font-semibold",
								children: "Clear all attempts"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									resetContent();
									window.alert("Content store reset to shipped + demo seed.");
								},
								className: "min-h-11 rounded-full border border-line px-4 text-sm font-semibold",
								children: "Reset content seed"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					leave();
					navigate({ to: "/" });
				},
				className: "mt-6 min-h-12 rounded-full border border-line px-6 text-sm font-semibold",
				children: "Log out"
			})
		]
	});
}
//#endregion
export { AccountPage as component };
