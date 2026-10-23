//#region node_modules/.nitro/vite/services/ssr/assets/assessment-BvX2l6XN.js
function scoreObjective(questions, picks) {
	let score = 0, total = 0, marked = 0;
	for (const q of questions) {
		if (q.answer == null || q.answerKeyStatus === "missing") continue;
		total += 1;
		marked += 1;
		if (picks[q.id] === q.answer) score += 1;
	}
	return {
		score,
		total,
		marked
	};
}
function attemptsByKind(attempts) {
	return {
		topic: attempts.filter((a) => a.kind === "topic" || !a.kind),
		jamb: attempts.filter((a) => a.kind === "jamb"),
		waec: attempts.filter((a) => a.kind === "waec")
	};
}
function keyLabel(status) {
	if (status === "demo") return "Demo answer key";
	if (status === "shipped") return "Answer key";
	if (status === "missing") return "No key";
	return "Answer key";
}
//#endregion
export { keyLabel as n, scoreObjective as r, attemptsByKind as t };
