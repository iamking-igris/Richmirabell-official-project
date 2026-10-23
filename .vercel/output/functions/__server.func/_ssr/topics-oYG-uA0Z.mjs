import { i as __toESM } from "../_runtime.mjs";
import { S as useNavigate, Z as require_react, b as Link, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/topics-oYG-uA0Z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Topics() {
	const subjects = useContent((s) => s.subjects);
	const upsertTopic = useContent((s) => s.upsertTopic);
	const navigate = useNavigate();
	const [subjectId, setSubjectId] = (0, import_react.useState)(subjects[0]?.id ?? "");
	const [title, setTitle] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Topics"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-6 flex flex-wrap gap-2",
			onSubmit: (e) => {
				e.preventDefault();
				const name = title.trim();
				if (!name || !subjectId) return;
				const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
				upsertTopic(subjectId, {
					id,
					title: name,
					minutes: 12,
					summary: "",
					status: "draft",
					notes: [],
					questions: []
				});
				setTitle("");
				navigate({
					to: "/admin/topics/$id",
					params: { id }
				});
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: subjectId,
					onChange: (e) => setSubjectId(e.target.value),
					className: "rounded-xl border border-line bg-surface px-3 py-3",
					children: subjects.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: s.id,
						children: s.name
					}, s.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: title,
					onChange: (e) => setTitle(e.target.value),
					"aria-label": "New topic title",
					placeholder: "Topic title, e.g. Simultaneous equations",
					className: "min-w-48 flex-1 rounded-xl border border-line bg-surface px-3 py-3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "rounded-full bg-primary px-4 py-3 font-semibold text-primary-fg",
					children: "New topic"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface",
			children: subjects.flatMap((subject) => subject.topics.map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/admin/topics/$id",
				params: { id: topic.id },
				className: "flex items-center justify-between gap-3 px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block font-medium",
					children: topic.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-sm text-muted",
					children: [
						subject.name,
						" · ",
						topic.questions.length,
						" questions"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm",
					children: topic.status === "draft" ? "Draft" : "Published"
				})]
			}) }, topic.id)))
		})
	] });
}
//#endregion
export { Topics as component };
