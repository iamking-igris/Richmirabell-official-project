import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent, o as locateTopic } from "./content-Bo1Mw7-U.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { _ as ArrowUp, a as Trash2, s as Plus, y as ArrowDown } from "../_libs/lucide-react.mjs";
import { s as Route$6 } from "./router-UkCfE7Pd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/topics._id-CZaCdtPn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var field = "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3";
var KEYS = [
	"A",
	"B",
	"C",
	"D"
];
function Editor() {
	const { id } = Route$6.useParams();
	const subjects = useContent((s) => s.subjects);
	const found = locateTopic(subjects, id);
	if (!found) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "That topic is not on Richmirabel." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Form, {
		subject: found.subject,
		initial: found.topic
	}, id);
}
function validate(t) {
	if (!t.title.trim()) return "Add a title.";
	if (t.notes.length === 0) return "Add at least one note block.";
	const bad = t.notes.findIndex((b) => !b.heading.trim() || b.paragraphs.length === 0);
	if (bad >= 0) return `Note block ${bad + 1} needs a heading and a paragraph.`;
	if (t.status !== "draft") {
		if (t.questions.length < 4) return "Add at least 4 questions before publishing.";
		for (let i = 0; i < t.questions.length; i++) {
			const q = t.questions[i];
			if (!q.prompt.trim()) return `Question ${i + 1} has no prompt.`;
			if (q.options.some((o) => !o.text.trim())) return `Question ${i + 1} has an empty option.`;
			if (!q.explain?.trim()) return `Question ${i + 1} has no explanation.`;
		}
	}
	return null;
}
function Form({ subject, initial }) {
	const upsert = useContent((s) => s.upsertTopic);
	const [topic, setTopic] = (0, import_react.useState)(structuredClone(initial));
	const [tab, setTab] = (0, import_react.useState)("Details");
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [dirty, setDirty] = (0, import_react.useState)(false);
	const edit = (patch) => {
		setTopic((t) => ({
			...t,
			...patch
		}));
		setDirty(true);
		setMsg(null);
	};
	const setBlock = (i, patch) => edit({ notes: topic.notes.map((b, k) => k === i ? {
		...b,
		...patch
	} : b) });
	const move = (list, i, d) => {
		const n = [...list];
		const j = i + d;
		if (j < 0 || j >= n.length) return n;
		[n[i], n[j]] = [n[j], n[i]];
		return n;
	};
	const setQ = (i, patch) => edit({ questions: topic.questions.map((q, k) => k === i ? {
		...q,
		...patch
	} : q) });
	function save(status) {
		const next = {
			...topic,
			status
		};
		const err = validate(next);
		if (err) {
			setMsg({
				ok: false,
				text: err
			});
			return;
		}
		upsert(subject.id, next);
		setTopic(next);
		setDirty(false);
		setMsg({
			ok: true,
			text: status === "published" ? "Published." : "Saved."
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin/topics",
				className: "inline-flex min-h-11 items-center text-sm font-semibold text-primary",
				children: "All topics"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: subject.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl",
					children: topic.title || "Untitled topic"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [topic.status === "draft" ? "Draft" : "Published", dirty ? " · unsaved changes" : ""]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 flex gap-2",
				role: "tablist",
				children: [
					"Details",
					"Note",
					"Questions"
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "tab",
					"aria-selected": tab === t,
					onClick: () => setTab(t),
					className: cn("min-h-11 rounded-full border px-5 text-sm font-semibold", tab === t ? "border-ink bg-ink text-primary-fg" : "border-line bg-surface"),
					children: [t, t === "Questions" ? ` (${topic.questions.length})` : t === "Note" ? ` (${topic.notes.length})` : ""]
				}, t))
			}),
			tab === "Details" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["Title", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: topic.title,
							onChange: (e) => edit({ title: e.target.value }),
							className: field
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: ["One-line summary", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: topic.summary,
							onChange: (e) => edit({ summary: e.target.value }),
							className: field
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm",
							children: ["Minutes to read", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 1,
								value: topic.minutes,
								onChange: (e) => edit({ minutes: Math.max(1, Number(e.target.value) || 1) }),
								className: field
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm",
							children: ["Diagram", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: topic.diagram ?? "",
								onChange: (e) => edit({ diagram: e.target.value || void 0 }),
								className: field,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "None"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "wave",
										children: "Wave"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "cell",
										children: "Cell"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "balance",
										children: "Balance"
									})
								]
							})]
						})]
					})
				]
			}),
			tab === "Note" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 space-y-4",
				children: [topic.notes.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-semibold",
								children: ["Block ", i + 1]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Move up",
										onClick: () => edit({ notes: move(topic.notes, i, -1) }),
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Move down",
										onClick: () => edit({ notes: move(topic.notes, i, 1) }),
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Delete block",
										onClick: () => {
											if (confirm(`Delete block ${i + 1}?`)) edit({ notes: topic.notes.filter((_, k) => k !== i) });
										},
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-2 block text-sm",
							children: ["Heading", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: b.heading,
								onChange: (e) => setBlock(i, { heading: e.target.value }),
								className: field
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-sm",
							children: ["Paragraphs (blank line between each)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 5,
								value: b.paragraphs.join("\n\n"),
								onChange: (e) => setBlock(i, { paragraphs: e.target.value.split(/\n\n+/).map((x) => x.trim()).filter(Boolean) }),
								className: field
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-sm",
							children: ["Formula (optional)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: b.formula ?? "",
								onChange: (e) => setBlock(i, { formula: e.target.value || void 0 }),
								className: field
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-sm",
							children: ["Bullet points (one per line, optional)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 3,
								value: (b.points ?? []).join("\n"),
								onChange: (e) => setBlock(i, { points: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) }),
								className: field
							})]
						})
					]
				}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => edit({ notes: [...topic.notes, {
						heading: "",
						paragraphs: []
					}] }),
					className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Add block"]
				})]
			}),
			tab === "Questions" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 space-y-4",
				children: [topic.questions.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-semibold",
								children: ["Question ", i + 1]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Move up",
										onClick: () => edit({ questions: move(topic.questions, i, -1) }),
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Move down",
										onClick: () => edit({ questions: move(topic.questions, i, 1) }),
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Delete question",
										onClick: () => {
											if (confirm(`Delete question ${i + 1}?`)) edit({ questions: topic.questions.filter((_, k) => k !== i) });
										},
										className: "inline-flex size-11 items-center justify-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-2 block text-sm",
							children: ["Prompt", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								value: q.prompt,
								onChange: (e) => setQ(i, { prompt: e.target.value }),
								className: field
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid gap-3 sm:grid-cols-2",
							children: q.options.map((o, k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-sm",
								children: [
									"Option ",
									o.key,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: o.text,
										onChange: (e) => setQ(i, { options: q.options.map((x, j) => j === k ? {
											...x,
											text: e.target.value
										} : x) }),
										className: field
									})
								]
							}, o.key))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
							className: "mt-3 flex flex-wrap items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "mb-1",
								children: "Correct answer"
							}), KEYS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: cn("flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-4", q.answer === k ? "border-primary bg-primary text-primary-fg" : "border-line"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "radio",
									name: `ans-${q.id}`,
									checked: q.answer === k,
									onChange: () => setQ(i, { answer: k }),
									className: "sr-only"
								}), k]
							}, k))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-3 block text-sm",
							children: ["Explanation", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								value: q.explain,
								onChange: (e) => setQ(i, { explain: e.target.value }),
								className: field
							})]
						})
					]
				}, q.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => edit({ questions: [...topic.questions, {
						id: `${topic.id}-q${Date.now().toString(36)}`,
						prompt: "",
						options: KEYS.map((key) => ({
							key,
							text: ""
						})),
						answer: "A",
						explain: ""
					}] }),
					className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Add question"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky bottom-0 mt-8 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => save("published"),
						className: "min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-fg",
						children: "Publish"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => save("draft"),
						className: "min-h-12 rounded-full border border-line bg-surface px-6 font-semibold",
						children: "Save as draft"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "status",
						"aria-live": "polite",
						className: cn("text-sm", msg && !msg.ok && "font-semibold"),
						children: msg?.text
					})
				]
			})
		]
	});
}
//#endregion
export { Editor as component };
