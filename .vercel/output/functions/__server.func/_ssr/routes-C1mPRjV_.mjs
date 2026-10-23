import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession } from "./session-BUK9M_Cu.mjs";
import { i as plural, r as photoOf } from "./format-44Ft2NgX.mjs";
import { l as Menu, t as X } from "../_libs/lucide-react.mjs";
import { t as BrandMark } from "./brand-BEFfcJsS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C1mPRjV_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var faqs = [
	{
		q: "What is Richmirabel?",
		a: "A JAMB and WAEC study space organised by topic. You read a short note, then sit a short set on that topic only."
	},
	{
		q: "Is it for JAMB, WAEC, or both?",
		a: "Both. Richmirabel is for Science students. Physics, Chemistry, Biology, and Mathematics are open now."
	},
	{
		q: "How does topic-by-topic study work?",
		a: "Choose a subject, open one topic, read the note, then answer the questions that belong to it."
	},
	{
		q: "What happens during the free trial?",
		a: "You get 48 hours from the moment you finish setup. Notes and practice are open for those two days. After that, notes stay readable."
	},
	{
		q: "How much does term access cost?",
		a: "₦4,500 for the term, after your two free days."
	},
	{
		q: "Can I track my progress?",
		a: "Yes. After you submit a set, your best score for that topic is saved, and your dashboard points you to the topic to revisit."
	},
	{
		q: "Can I use it on another phone?",
		a: "Your progress is saved on the device you study on. Syncing across devices is coming."
	}
];
function WaveRule() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 280 48",
		className: "h-10 w-full max-w-xs",
		"aria-hidden": true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			className: "draw-line",
			d: "M4 28 C 40 8, 70 44, 110 24 S 180 8, 220 26 270 40, 276 18",
			fill: "none",
			stroke: "#a6843d",
			strokeWidth: "1.6"
		})
	});
}
function Landing() {
	const navigate = useNavigate();
	const name = useSession((s) => s.name);
	const subjects = publishedSubjects(useContent((s) => s.subjects));
	const [menu, setMenu] = (0, import_react.useState)(false);
	const [faq, setFaq] = (0, import_react.useState)(null);
	const science = [
		"physics",
		"chemistry",
		"biology",
		"mathematics"
	].map((id) => subjects.find((s) => s.id === id)).filter((s) => Boolean(s));
	(0, import_react.useEffect)(() => {
		const nodes = document.querySelectorAll(".reveal");
		nodes.forEach((node) => node.classList.add("armed"));
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add("in");
		}, { threshold: .08 });
		nodes.forEach((node) => observer.observe(node));
		return () => {
			observer.disconnect();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!menu) return;
		const onKey = (event) => {
			if (event.key === "Escape") setMenu(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [menu]);
	function start() {
		if (name) navigate({ to: "/studio" });
		else navigate({ to: "/create-account" });
	}
	const links = [
		["Home", "#top"],
		["Subjects", "#subjects"],
		["How it works", "#how"],
		["Pricing", "#pricing"],
		["FAQs", "#faqs"]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-30 border-b border-line bg-paper",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "hidden items-center gap-7 text-sm lg:flex",
							"aria-label": "Page",
							children: links.map(([label, href]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href,
								className: "nav-link text-muted hover:text-ink",
								children: label
							}, href))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/login",
									className: "hidden text-sm text-muted hover:text-ink sm:inline",
									children: "Sign in"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: start,
									className: "inline-flex min-h-11 items-center bg-primary px-4 text-sm font-semibold text-primary-fg",
									children: name ? "Continue learning" : "Start free trial"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "inline-flex size-11 items-center justify-center border border-line lg:hidden",
									"aria-expanded": menu,
									"aria-controls": "home-menu",
									"aria-label": menu ? "Close menu" : "Open menu",
									onClick: () => setMenu((v) => !v),
									children: menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
								})
							]
						})
					]
				}), menu && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					id: "home-menu",
					className: "menu-drop max-h-[70vh] overflow-auto border-t border-line bg-paper px-4 py-2 lg:hidden",
					"aria-label": "Page",
					children: links.map(([label, href]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href,
						className: "flex min-h-11 items-center text-sm",
						onClick: () => setMenu(false),
						children: label
					}, href))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "top",
				className: "mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise text-sm font-medium tracking-wide text-brass",
						children: "Science · JAMB · WAEC"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "rise rise-2 mt-3 font-display text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-7xl",
						children: "Study one topic until it cannot surprise you."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveRule, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise rise-3 mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg",
						children: "Physics, Chemistry, Biology, and Mathematics are open. A note, a diagram, then questions on that topic alone."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rise rise-4 mt-7 flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: start,
							className: "inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg",
							children: name ? "Continue learning" : "Start free trial"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#subjects",
							className: "inline-flex min-h-11 items-center border border-ink px-5 text-sm font-semibold",
							children: "Explore subjects"
						})]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
					className: "rise rise-3 relative sm:mr-4 sm:mt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute -top-4 right-0 hidden h-full w-[92%] border border-brass sm:block",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "frame-photo relative",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/media/atelier.jpg",
								alt: "An open green book, a brass compass, and a drawn wave on warm paper",
								className: "photo-in aspect-[5/4] w-full object-cover object-[72%_45%] sm:aspect-[4/3]"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
							className: "mt-3 text-xs tracking-wide text-muted",
							children: "One idea, drawn clearly, then practised."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden border-y border-line py-3",
				"aria-hidden": true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "marquee flex w-max gap-12 text-xs tracking-[0.22em] text-muted uppercase",
					children: [
						"Physics",
						"Chemistry",
						"Biology",
						"Mathematics",
						"Physics",
						"Chemistry",
						"Biology",
						"Mathematics"
					].map((label, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }, `${label}-${i}`))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "reveal bg-ink text-primary-fg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-4xl leading-tight sm:text-5xl",
						children: "Understand it. Practise it. Come back to the part that still slips."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-relaxed text-primary-fg/75",
						children: "Richmirabel keeps each subject in syllabus order. You finish a topic before the next one starts."
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "subjects",
				className: "reveal mx-auto max-w-6xl px-4 py-16",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "max-w-xl font-display text-4xl leading-tight sm:text-5xl",
						children: "The four science subjects are open now."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base",
						children: "Start with the subject you need. Each topic has a note, a quick diagram, and a short practice set built for revision."
					}),
					science[0] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/studio/subject/$id",
						params: { id: science[0].id },
						className: "press mt-8 grid overflow-hidden bg-surface md:grid-cols-[1.2fr_0.8fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "frame-photo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: photoOf(science[0]),
								alt: "",
								className: "photo aspect-[16/10] w-full object-cover md:aspect-auto md:h-full md:min-h-64"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col justify-end p-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold tracking-wide text-primary",
									children: "Available now"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mt-2 font-display text-4xl",
									children: science[0].name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-relaxed text-muted",
									children: science[0].blurb
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-6 text-sm",
									children: [plural(science[0].topics.length, "topic"), " · Start here"]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
						children: science.map((subject) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border border-line bg-surface p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-xl",
								children: subject.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: "Open now"
							})]
						}, subject.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "reveal border-t border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl px-4 py-16",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "max-w-xl font-display text-4xl leading-tight sm:text-5xl",
							children: "Study with understanding. Practise with purpose."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base",
							children: "Work through one topic properly, then answer questions on that topic. Not a mixed pile you hope will stick."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-10 grid gap-4 lg:grid-cols-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "relative overflow-hidden bg-ink p-8 text-primary-fg lg:col-span-4 lg:row-span-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
											viewBox: "0 0 280 48",
											className: "mb-8 h-8 w-40",
											"aria-hidden": true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
												d: "M4 28 C 40 8, 70 44, 110 24 S 180 8, 220 26 270 40, 276 18",
												fill: "none",
												stroke: "#a6843d",
												strokeWidth: "1.6"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "font-display text-3xl sm:text-4xl",
											children: "Understand it before you move on"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-4 max-w-md text-sm leading-relaxed text-primary-fg/80",
											children: "Pick one topic. Read the note. Sit the short set that belongs to it. The next topic waits until this one is no longer a surprise."
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "bg-surface p-6 lg:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-2xl",
										children: "Clear explanations, less confusion"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm leading-relaxed text-muted",
										children: "Notes are written in plain language, with a formula or a diagram only when the idea needs one. They are supplied and reviewed, not generated on the spot."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "bg-soft p-6 lg:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-2xl",
										children: "Practise what you've just learnt"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm leading-relaxed text-muted",
										children: "Each set stays on the topic you just read. It is a short CBT-style practice, not a copy of the official JAMB screen."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "border border-line bg-paper p-6 lg:col-span-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-2xl",
										children: "Every mistake can teach you something"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm leading-relaxed text-muted",
										children: "After you submit, each question shows the answer and a short explanation, so a miss has a reason you can reread."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "bg-surface p-6 lg:col-span-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-2xl",
										children: "See how far you've come"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-sm leading-relaxed text-muted",
										children: "Progress keeps the best score for each topic you have sat. It lives on this device. It does not follow you to another phone."
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
									className: "border-t-2 border-brass bg-surface p-6 lg:col-span-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-2xl",
										children: "Your subjects. Your pace. Your next step."
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 max-w-2xl text-sm leading-relaxed text-muted",
										children: "Open the subject you need, stay on the topic that is still weak, and leave the rest. There is no automatic study plan deciding the order for you."
									})]
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "how",
				className: "reveal border-y border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl px-4 py-14",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-4xl",
						children: "Four moves"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-10 grid gap-8 md:grid-cols-4",
						children: [
							[
								"01",
								"Choose",
								"A subject, then one topic."
							],
							[
								"02",
								"Read",
								"A short note and a diagram when the idea needs one."
							],
							[
								"03",
								"Practise",
								"A CBT-style set on that topic only."
							],
							[
								"04",
								"Return",
								"Your best score shows what to reopen."
							]
						].map(([n, title, body]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border-t border-brass pt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-sm text-brass",
									children: n
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mt-2 font-display text-3xl",
									children: title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm leading-relaxed text-muted",
									children: body
								})
							]
						}, n))
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "pricing",
				className: "reveal bg-soft",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl items-end gap-8 px-4 py-16 lg:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium text-brass",
							children: "Two days, then the term"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 font-display text-6xl sm:text-7xl",
							children: "₦4,500"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-md text-sm leading-relaxed text-muted",
							children: "The trial starts when you enter your first name and lasts 48 hours. After that, notes stay open and practice waits for term access. Nothing here charges a card."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-start gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-sm text-lg leading-snug",
							children: "The subjects that are open now, their notes, the sets, the mark guides, and progress on this device."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: start,
							className: "inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg",
							children: name ? "Continue learning" : "Start free trial"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "faqs",
				className: "reveal mx-auto max-w-3xl px-4 py-14",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-4xl",
					children: "Questions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 border-t border-line",
					children: faqs.map((item, index) => {
						const shown = faq === index;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-b border-line",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left",
								"aria-expanded": shown,
								onClick: () => setFaq(shown ? null : index),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.q }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-hidden": true,
									className: "text-brass",
									children: shown ? "–" : "+"
								})]
							}), shown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "faq-open pb-4 text-sm leading-relaxed text-muted",
								children: item.a
							})]
						}, item.q);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative overflow-hidden bg-ink text-primary-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/media/atelier.jpg",
					alt: "",
					className: "absolute inset-0 h-full w-full object-cover opacity-25"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:flex-row sm:items-end sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "max-w-lg font-display text-4xl sm:text-5xl",
						children: "Begin with the topic that has been bothering you."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: start,
							className: "inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-fg",
							children: name ? "Continue learning" : "Start free trial"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#subjects",
							className: "inline-flex min-h-11 items-center border border-primary-fg/40 px-5 text-sm font-semibold",
							children: "Explore subjects"
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "border-t border-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandMark, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#subjects",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Subjects"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#how",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "How it works"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#pricing",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Pricing"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "#faqs",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "FAQs"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Dashboard"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio/guides",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Guides"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio/progress",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Scores"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/studio/plan",
									className: "block min-h-11 text-muted sm:min-h-0",
									children: "Plan"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 pb-6 text-xs text-muted",
					children: "© 2026 Richmirabel"
				})]
			})
		]
	});
}
//#endregion
export { Landing as component };
