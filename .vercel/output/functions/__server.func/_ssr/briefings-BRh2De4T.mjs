import { i as __toESM } from "../_runtime.mjs";
import { Z as require_react, w as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as useContent } from "./content-Bo1Mw7-U.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/briefings-BRh2De4T.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Briefings() {
	const news = useContent((s) => s.news);
	const upsertNews = useContent((s) => s.upsertNews);
	const removeNews = useContent((s) => s.removeNews);
	const [title, setTitle] = (0, import_react.useState)("");
	const [body, setBody] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Briefings"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-6 space-y-2",
			onSubmit: (e) => {
				e.preventDefault();
				if (!title.trim()) return;
				upsertNews({
					id: "n-" + Date.now(),
					tag: "Study",
					title: title.trim(),
					date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", {
						day: "numeric",
						month: "short",
						year: "numeric"
					}),
					body: body.trim() || title.trim()
				});
				setTitle("");
				setBody("");
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: title,
					onChange: (e) => setTitle(e.target.value),
					placeholder: "Title",
					className: "w-full rounded-xl border border-line bg-surface px-3 py-3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: body,
					onChange: (e) => setBody(e.target.value),
					placeholder: "The briefing",
					rows: 4,
					className: "w-full rounded-xl border border-line bg-surface px-3 py-3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "rounded-full bg-primary px-4 py-3 font-semibold text-primary-fg",
					children: "Publish"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 space-y-2",
			children: news.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "text-sm text-muted",
					onClick: () => {
						if (confirm(`Remove “${item.title}”?`)) removeNews(item.id);
					},
					children: "Delete"
				})]
			}, item.id))
		})
	] });
}
//#endregion
export { Briefings as component };
