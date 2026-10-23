import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session-BUK9M_Cu.js
var TWO_DAYS = 1728e5;
function newId() {
	return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
var useSession = create()(persist((set, get) => ({
	name: "",
	email: "",
	trialStart: null,
	subscribed: false,
	attempts: [],
	payments: [],
	exams: [],
	pathway: "sciences",
	selectedSubjects: ["physics"],
	jambSubjects: [],
	examMonth: null,
	onboardingComplete: false,
	demoMode: true,
	enter: (name, email = "") => set({
		name: name.trim(),
		email: email.trim()
	}),
	completeOnboarding: ({ exams, jambSubjects, examMonth }) => set((s) => ({
		exams,
		pathway: "sciences",
		selectedSubjects: exams.includes("jamb") ? ["english", ...jambSubjects] : ["physics"],
		jambSubjects: exams.includes("jamb") ? jambSubjects : [],
		examMonth,
		onboardingComplete: true,
		trialStart: s.trialStart ?? Date.now()
	})),
	updateProfile: ({ exams, jambSubjects, examMonth }) => set({
		exams,
		selectedSubjects: exams.includes("jamb") ? ["english", ...jambSubjects] : ["physics"],
		jambSubjects: exams.includes("jamb") ? jambSubjects : [],
		examMonth
	}),
	subscribe: () => set({ subscribed: true }),
	resetTrial: () => set({
		trialStart: Date.now() - TWO_DAYS - 1e3,
		subscribed: false
	}),
	record: (attempt) => {
		const id = attempt.id ?? newId();
		const at = attempt.at ?? Date.now();
		if (get().attempts.find((a) => a.id === id)) return id;
		set((s) => ({ attempts: [{
			...attempt,
			id,
			at,
			kind: attempt.kind ?? "topic"
		}, ...s.attempts].slice(0, 120) }));
		return id;
	},
	addPayment: (payment) => set((s) => ({ payments: [payment, ...s.payments] })),
	leave: () => set({
		name: "",
		email: "",
		trialStart: null,
		subscribed: false,
		attempts: [],
		payments: [],
		exams: [],
		pathway: "sciences",
		selectedSubjects: ["physics"],
		jambSubjects: [],
		examMonth: null,
		onboardingComplete: false
	}),
	setDemoMode: (on) => set({ demoMode: on }),
	clearDemoAttempts: () => set((s) => ({ attempts: s.attempts.filter((a) => !a.demo) })),
	clearAllAttempts: () => set({ attempts: [] })
}), {
	name: "richmirabel-session",
	version: 5,
	migrate: (state) => {
		const s = state;
		const attempts = (s.attempts ?? []).map((a) => ({
			id: a.id ?? `legacy_${a.topicId}_${a.at}`,
			topicId: a.topicId,
			title: a.title ?? a.topicId,
			score: a.score,
			total: a.total,
			at: a.at,
			kind: a.kind ?? "topic",
			demo: a.demo,
			picks: a.picks,
			written: a.written,
			items: a.items,
			paperId: a.paperId,
			subjectLabel: a.subjectLabel
		}));
		return {
			...s,
			exams: s.exams ?? [],
			jambSubjects: s.jambSubjects ?? [],
			pathway: "sciences",
			demoMode: s.demoMode ?? true,
			attempts
		};
	}
}));
function trialLeft(start, subscribed) {
	if (subscribed) return {
		active: true,
		label: "Full access"
	};
	if (!start) return {
		active: true,
		label: "Trial not started"
	};
	const left = TWO_DAYS - (Date.now() - start);
	if (left <= 0) return {
		active: false,
		label: "Trial ended"
	};
	const hours = Math.floor(left / 36e5);
	const days = Math.floor(hours / 24);
	const rem = hours % 24;
	return {
		active: true,
		label: days > 0 ? `${days}d ${rem}h left` : `${rem}h left`
	};
}
function bestByTopic(attempts) {
	const map = /* @__PURE__ */ new Map();
	for (const attempt of attempts) {
		if (attempt.kind && attempt.kind !== "topic") continue;
		const prev = map.get(attempt.topicId);
		if (!prev || attempt.score / Math.max(attempt.total, 1) > prev.score / Math.max(prev.total, 1)) map.set(attempt.topicId, attempt);
	}
	return map;
}
function findAttempt(attempts, id) {
	return attempts.find((a) => a.id === id) ?? null;
}
//#endregion
export { useSession as i, findAttempt as n, trialLeft as r, bestByTopic as t };
