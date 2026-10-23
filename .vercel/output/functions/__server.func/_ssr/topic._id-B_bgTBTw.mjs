import { b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, o as locateTopic, s as publishedSubjects } from "./content-Bo1Mw7-U.mjs";
import { i as useSession, t as bestByTopic } from "./session-BUK9M_Cu.mjs";
import { i as plural } from "./format-44Ft2NgX.mjs";
import { r as Route$1 } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/topic._id-B_bgTBTw.js
var import_jsx_runtime = require_jsx_runtime();
function WaveDiagram() {
	const width = 640;
	const height = 220;
	const mid = 110;
	const amp = 52;
	const points = Array.from({ length: 121 }, (_, i) => {
		const x = 48 + i * 4.6;
		const y = mid - Math.sin(i / 120 * Math.PI * 4) * amp;
		return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
	}).join(" ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "overflow-hidden rounded-2xl border border-line bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${width} ${height}`,
			className: "h-auto w-full",
			role: "img",
			"aria-label": "Transverse wave showing wavelength and amplitude",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "40",
					y1: "16",
					x2: "40",
					y2: "204",
					stroke: "#1a2420",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "40",
					y1: mid,
					x2: "610",
					y2: mid,
					stroke: "#1a2420",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: points,
					fill: "none",
					stroke: "#0d6b52",
					strokeWidth: "2.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "48",
					y1: 58,
					x2: "48",
					y2: mid,
					stroke: "#a6843d",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "54",
					y: 72,
					fill: "#a6843d",
					fontSize: "13",
					fontFamily: "Outfit, sans-serif",
					children: "amplitude"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "163",
					y1: "36",
					x2: "394",
					y2: "36",
					stroke: "#1a2420",
					strokeWidth: "1.25"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "163",
					y1: "30",
					x2: "163",
					y2: "42",
					stroke: "#1a2420",
					strokeWidth: "1.25"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "394",
					y1: "30",
					x2: "394",
					y2: "42",
					stroke: "#1a2420",
					strokeWidth: "1.25"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "240",
					y: "28",
					fill: "#1a2420",
					fontSize: "13",
					fontFamily: "Outfit, sans-serif",
					children: "wavelength λ"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "520",
					y: 138,
					fill: "#5e6a62",
					fontSize: "12",
					fontFamily: "Outfit, sans-serif",
					children: "distance"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "8",
					y: "24",
					fill: "#5e6a62",
					fontSize: "12",
					fontFamily: "Outfit, sans-serif",
					children: "disp."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
			className: "border-t border-line px-4 py-3 text-sm text-muted",
			children: "Crest to crest is one wavelength. Amplitude is the height from the rest line, not crest to trough."
		})]
	});
}
function CellDiagram() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "overflow-hidden rounded-2xl border border-line bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 640 240",
			className: "h-auto w-full",
			role: "img",
			"aria-label": "Simple animal cell with labelled parts",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "300",
					cy: "120",
					rx: "210",
					ry: "90",
					fill: "#f4efe6",
					stroke: "#0d6b52",
					strokeWidth: "3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "250",
					cy: "118",
					r: "36",
					fill: "#fffdf8",
					stroke: "#1a2420",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "258",
					cy: "114",
					r: "12",
					fill: "#0d6b52"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "360",
					cy: "90",
					rx: "28",
					ry: "14",
					fill: "none",
					stroke: "#a6843d",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "340",
					cy: "150",
					rx: "22",
					ry: "12",
					fill: "none",
					stroke: "#a6843d",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "430",
					y: "70",
					fill: "#1a2420",
					fontSize: "14",
					fontFamily: "Outfit, sans-serif",
					children: "membrane"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "430",
					y1: "76",
					x2: "500",
					y2: "100",
					stroke: "#1a2420",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "168",
					y: "70",
					fill: "#1a2420",
					fontSize: "14",
					fontFamily: "Outfit, sans-serif",
					children: "nucleus"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "200",
					y1: "78",
					x2: "230",
					y2: "100",
					stroke: "#1a2420",
					strokeWidth: "1"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "390",
					y: "160",
					fill: "#1a2420",
					fontSize: "14",
					fontFamily: "Outfit, sans-serif",
					children: "mitochondria"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "390",
					y1: "150",
					x2: "368",
					y2: "108",
					stroke: "#1a2420",
					strokeWidth: "1"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
			className: "border-t border-line px-4 py-3 text-sm text-muted",
			children: "Animal cell sketch for labelling practice. A plant cell would add a cell wall and chloroplasts."
		})]
	});
}
function BalanceDiagram() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-soft px-4 py-4 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Reactants"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-display text-2xl text-ink",
							children: "2H₂ + O₂"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "4 H · 2 O"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center font-display text-3xl text-primary",
					"aria-hidden": true,
					children: "→"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-soft px-4 py-4 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Products"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-display text-2xl text-ink",
							children: "2H₂O"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "4 H · 2 O"
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
			className: "mt-3 text-sm text-muted",
			children: "Same atoms on both sides. The coefficients changed; the formulas did not."
		})]
	});
}
function TopicPage() {
	const { id } = Route$1.useParams();
	const subjects = publishedSubjects(useContent((s) => s.subjects));
	const found = locateTopic(subjects, id);
	const attempts = useSession((s) => s.attempts);
	const best = bestByTopic(attempts).get(id);
	const last = attempts.find((a) => a.topicId === id);
	if (!found) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Topic not found"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "That topic is not open. Start with Physics."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/studio",
				className: "mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg",
				children: "Back to dashboard"
			})
		]
	});
	const { subject, topic } = found;
	const remember = topic.notes.flatMap((b) => b.points ?? []).slice(0, 5);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl pb-28 md:pb-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/studio/subject/$id",
				params: { id: subject.id },
				className: "inline-flex min-h-11 items-center text-sm font-semibold text-primary",
				children: ["Back to ", subject.name]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "font-display text-4xl leading-tight sm:text-5xl",
				children: [topic.title, topic.origin === "demo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-3 align-middle rounded-full bg-soft px-2 py-0.5 text-sm font-semibold text-muted",
					children: "DEMO"
				}) : null]
			}),
			topic.origin === "demo" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 rounded-xl border border-dashed border-line bg-soft/50 px-3 py-2 text-sm text-muted",
				children: "Synthetic demo content for testing. Not teacher-approved Richmirabel notes."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: topic.summary
			}),
			topic.mainTopic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [
					subject.name,
					" · ",
					topic.mainTopic
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					topic.minutes,
					" min read · ",
					plural(topic.questions.length, "objective question"),
					topic.theory && topic.theory.length > 0 ? ` · ${topic.theory.length} theory` : "",
					best ? ` · Best ${best.score}/${best.total}` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6 rounded-2xl border border-line bg-surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl",
					children: "Learning objectives"
				}), topic.objectives && topic.objectives.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2 text-sm",
					children: topic.objectives.map((objective) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-2 size-2 shrink-0 bg-primary",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: objective })]
					}, objective))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Learning objectives for this topic are being prepared from the source notes."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 space-y-9 text-[1.0625rem] leading-[1.7]",
				children: [
					topic.diagram === "wave" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveDiagram, {}),
					topic.diagram === "cell" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CellDiagram, {}),
					topic.diagram === "balance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BalanceDiagram, {}),
					topic.notes.map((block) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl",
							children: block.heading
						}),
						block.paragraphs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3",
							children: p
						}, p)),
						block.formula && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 overflow-x-auto rounded-2xl bg-ink px-4 py-4 text-center font-display text-2xl text-primary-fg",
							children: block.formula
						}),
						block.points && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-2 text-base leading-snug",
							children: block.points.map((point) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-2 size-2 shrink-0 bg-primary",
									"aria-hidden": true
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: point })]
							}, point))
						})
					] }, block.heading)),
					remember.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "rounded-2xl border border-line bg-surface p-5 text-base leading-snug",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-xl",
							children: "Remember"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-2",
							children: remember.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: r }, r))
						})]
					})
				]
			}),
			last && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 text-sm text-muted",
				children: [
					"Last score ",
					last.score,
					"/",
					last.total,
					".",
					best ? ` Best ${best.score}/${best.total}.` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 z-10 flex justify-center px-4 md:static md:mt-8 md:justify-start",
				style: { bottom: "calc(4.25rem + env(safe-area-inset-bottom))" },
				children: topic.questions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/studio/practice/$id",
					params: { id: topic.id },
					className: "inline-flex h-11 min-w-36 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg shadow-sm",
					children: "Take Quiz"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted",
					children: "No quiz for this topic yet."
				})
			})
		]
	});
}
//#endregion
export { TopicPage as component };
