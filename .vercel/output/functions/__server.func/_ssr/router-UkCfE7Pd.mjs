import { i as __toESM } from "../_runtime.mjs";
import { C as useRouter, J as redirect, Z as require_react, _ as lazyRouteComponent, d as Scripts, f as HeadContent, g as Outlet, h as createRouter, v as createFileRoute, w as require_jsx_runtime, y as createRootRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-UkCfE7Pd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
/**
* Path-based preview hosts serve the dev server under `/{port_id}/` and strip
* that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
* prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
* client routing and generated links aligned with the public URL.
*/
var PATH_BASED_PREVIEW_HOSTS = /* @__PURE__ */ new Set([
	"preview.grok.genai.mil",
	"preview.grok.mil",
	"preview.grokgsac.com"
]);
var PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;
function previewPathPrefix(hostname, pathname) {
	if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return void 0;
	return PORT_ID_PREFIX.exec(pathname)?.[0];
}
function prefixRewrite(prefix) {
	return {
		input: ({ url }) => {
			if (url.pathname === prefix) url.pathname = "/";
			else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length);
			return url;
		},
		output: ({ url }) => {
			url.pathname = `${prefix}${url.pathname}`;
			return url;
		}
	};
}
function previewPathRewrite() {
	if (typeof window === "undefined") return void 0;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? prefixRewrite(prefix) : void 0;
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-E5nMDpII.css";
var Route$32 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Richmirabel: study one topic until it cannot surprise you" },
			{
				name: "description",
				content: "JAMB and WAEC prep, one topic at a time. Clear notes, short CBT sets, and progress that shows your weak topic."
			},
			{
				name: "theme-color",
				content: "#0d6b52"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-32.png"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Outfit:wght@400;500;600;700&display=swap"
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$28 = () => import("./routes-C1mPRjV_.mjs");
var Route$31 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$28, "component") });
var $$splitComponentImporter$27 = () => import("./admin-BIWZZA7z.mjs");
var Route$30 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$27, "component") });
var $$splitComponentImporter$26 = () => import("./create-account-BDNHynr4.mjs");
var Route$29 = createFileRoute("/create-account")({ component: lazyRouteComponent($$splitComponentImporter$26, "component") });
var Route$28 = createFileRoute("/dashboard")({ beforeLoad: () => {
	throw redirect({ to: "/studio" });
} });
var $$splitComponentImporter$25 = () => import("./forgot-password-Boq7nqgM.mjs");
var Route$27 = createFileRoute("/forgot-password")({ component: lazyRouteComponent($$splitComponentImporter$25, "component") });
var $$splitComponentImporter$24 = () => import("./login-s2ZNYLfr.mjs");
var Route$26 = createFileRoute("/login")({ component: lazyRouteComponent($$splitComponentImporter$24, "component") });
var $$splitComponentImporter$23 = () => import("./onboarding-DD0x8lTq.mjs");
var Route$25 = createFileRoute("/onboarding")({ component: lazyRouteComponent($$splitComponentImporter$23, "component") });
var Route$24 = createFileRoute("/signup")({ beforeLoad: () => {
	throw redirect({ to: "/create-account" });
} });
var $$splitComponentImporter$22 = () => import("./studio-BOlbhUvj.mjs");
var Route$23 = createFileRoute("/studio")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
var $$splitComponentImporter$21 = () => import("./admin-PPBtT8qe.mjs");
var Route$22 = createFileRoute("/admin/")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./briefings-BRh2De4T.mjs");
var Route$21 = createFileRoute("/admin/briefings")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./payments-CT4NYRTW.mjs");
var Route$20 = createFileRoute("/admin/payments")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
var $$splitComponentImporter$18 = () => import("./students-BJ53r5SM.mjs");
var Route$19 = createFileRoute("/admin/students")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./subjects-CNcQpMdN.mjs");
var Route$18 = createFileRoute("/admin/subjects")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./tools-ClWc2JEF.mjs");
var Route$17 = createFileRoute("/admin/tools")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./topics-oYG-uA0Z.mjs");
var Route$16 = createFileRoute("/admin/topics")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./studio-B_xiQiOM.mjs");
var Route$15 = createFileRoute("/studio/")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./account-DN6PXVHi.mjs");
var Route$14 = createFileRoute("/studio/account")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./cbt-BzAe_oXO.mjs");
var Route$13 = createFileRoute("/studio/cbt")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./guides-CgK_SDW1.mjs");
var Route$12 = createFileRoute("/studio/guides")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var Route$11 = createFileRoute("/studio/news")({ beforeLoad: () => {
	throw redirect({ to: "/studio/guides" });
} });
var $$splitComponentImporter$10 = () => import("./plan-5arBVFGr.mjs");
var Route$10 = createFileRoute("/studio/plan")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./profile-DnOwT-MF.mjs");
var Route$9 = createFileRoute("/studio/profile")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./progress-BwQ-daJW.mjs");
var Route$8 = createFileRoute("/studio/progress")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./subjects-CBjPvykz.mjs");
var Route$7 = createFileRoute("/studio/subjects")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./topics._id-CZaCdtPn.mjs");
var Route$6 = createFileRoute("/admin/topics/$id")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./cbt.jamb-_kWDiUvk.mjs");
var Route$5 = createFileRoute("/studio/cbt/jamb")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./practice._id-9hVH0Ctu.mjs");
var Route$4 = createFileRoute("/studio/practice/$id")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./review._attemptId-EWrG2xUS.mjs");
var Route$3 = createFileRoute("/studio/review/$attemptId")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./subject._id-D5fTxQF1.mjs");
var Route$2 = createFileRoute("/studio/subject/$id")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./topic._id-B_bgTBTw.mjs");
var Route$1 = createFileRoute("/studio/topic/$id")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./cbt.waec._paperId-DV8e0D80.mjs");
var Route = createFileRoute("/studio/cbt/waec/$paperId")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var IndexRoute = Route$31.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$32
});
var AdminRoute = Route$30.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$32
});
var CreateAccountRoute = Route$29.update({
	id: "/create-account",
	path: "/create-account",
	getParentRoute: () => Route$32
});
var DashboardRoute = Route$28.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => Route$32
});
var ForgotPasswordRoute = Route$27.update({
	id: "/forgot-password",
	path: "/forgot-password",
	getParentRoute: () => Route$32
});
var LoginRoute = Route$26.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$32
});
var OnboardingRoute = Route$25.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => Route$32
});
var SignupRoute = Route$24.update({
	id: "/signup",
	path: "/signup",
	getParentRoute: () => Route$32
});
var StudioRoute = Route$23.update({
	id: "/studio",
	path: "/studio",
	getParentRoute: () => Route$32
});
var AdminIndexRoute = Route$22.update({
	id: "/",
	path: "/",
	getParentRoute: () => AdminRoute
});
var AdminBriefingsRoute = Route$21.update({
	id: "/briefings",
	path: "/briefings",
	getParentRoute: () => AdminRoute
});
var AdminPaymentsRoute = Route$20.update({
	id: "/payments",
	path: "/payments",
	getParentRoute: () => AdminRoute
});
var AdminStudentsRoute = Route$19.update({
	id: "/students",
	path: "/students",
	getParentRoute: () => AdminRoute
});
var AdminSubjectsRoute = Route$18.update({
	id: "/subjects",
	path: "/subjects",
	getParentRoute: () => AdminRoute
});
var AdminToolsRoute = Route$17.update({
	id: "/tools",
	path: "/tools",
	getParentRoute: () => AdminRoute
});
var AdminTopicsRoute = Route$16.update({
	id: "/topics",
	path: "/topics",
	getParentRoute: () => AdminRoute
});
var StudioIndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => StudioRoute
});
var StudioAccountRoute = Route$14.update({
	id: "/account",
	path: "/account",
	getParentRoute: () => StudioRoute
});
var StudioCbtRoute = Route$13.update({
	id: "/cbt",
	path: "/cbt",
	getParentRoute: () => StudioRoute
});
var StudioGuidesRoute = Route$12.update({
	id: "/guides",
	path: "/guides",
	getParentRoute: () => StudioRoute
});
var StudioNewsRoute = Route$11.update({
	id: "/news",
	path: "/news",
	getParentRoute: () => StudioRoute
});
var StudioPlanRoute = Route$10.update({
	id: "/plan",
	path: "/plan",
	getParentRoute: () => StudioRoute
});
var StudioProfileRoute = Route$9.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => StudioRoute
});
var StudioProgressRoute = Route$8.update({
	id: "/progress",
	path: "/progress",
	getParentRoute: () => StudioRoute
});
var StudioSubjectsRoute = Route$7.update({
	id: "/subjects",
	path: "/subjects",
	getParentRoute: () => StudioRoute
});
var AdminTopicsIdRoute = Route$6.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AdminTopicsRoute
});
var StudioCbtJambRoute = Route$5.update({
	id: "/jamb",
	path: "/jamb",
	getParentRoute: () => StudioCbtRoute
});
var StudioPracticeIdRoute = Route$4.update({
	id: "/practice/$id",
	path: "/practice/$id",
	getParentRoute: () => StudioRoute
});
var StudioReviewAttemptIdRoute = Route$3.update({
	id: "/review/$attemptId",
	path: "/review/$attemptId",
	getParentRoute: () => StudioRoute
});
var StudioSubjectIdRoute = Route$2.update({
	id: "/subject/$id",
	path: "/subject/$id",
	getParentRoute: () => StudioRoute
});
var StudioTopicIdRoute = Route$1.update({
	id: "/topic/$id",
	path: "/topic/$id",
	getParentRoute: () => StudioRoute
});
var StudioCbtWaecPaperIdRoute = Route.update({
	id: "/waec/$paperId",
	path: "/waec/$paperId",
	getParentRoute: () => StudioCbtRoute
});
var AdminTopicsRouteChildren = { AdminTopicsIdRoute };
var AdminRouteChildren = {
	AdminBriefingsRoute,
	AdminPaymentsRoute,
	AdminStudentsRoute,
	AdminSubjectsRoute,
	AdminToolsRoute,
	AdminTopicsRoute: AdminTopicsRoute._addFileChildren(AdminTopicsRouteChildren),
	AdminIndexRoute
};
var AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren);
var StudioCbtRouteChildren = {
	StudioCbtJambRoute,
	StudioCbtWaecPaperIdRoute
};
var StudioRouteChildren = {
	StudioAccountRoute,
	StudioCbtRoute: StudioCbtRoute._addFileChildren(StudioCbtRouteChildren),
	StudioGuidesRoute,
	StudioNewsRoute,
	StudioPlanRoute,
	StudioProfileRoute,
	StudioProgressRoute,
	StudioSubjectsRoute,
	StudioIndexRoute,
	StudioPracticeIdRoute,
	StudioReviewAttemptIdRoute,
	StudioSubjectIdRoute,
	StudioTopicIdRoute
};
var rootRouteChildren = {
	IndexRoute,
	AdminRoute: AdminRouteWithChildren,
	CreateAccountRoute,
	DashboardRoute,
	ForgotPasswordRoute,
	LoginRoute,
	OnboardingRoute,
	SignupRoute,
	StudioRoute: StudioRoute._addFileChildren(StudioRouteChildren)
};
var routeTree = Route$32._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		rewrite: previewPathRewrite(),
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { Route$3 as a, Route$2 as i, Route as n, Route$4 as o, Route$1 as r, Route$6 as s, router_exports as t };
