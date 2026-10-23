//#region node_modules/.nitro/vite/services/ssr/assets/format-44Ft2NgX.js
var plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
var naira = (n) => "₦" + n.toLocaleString("en-NG");
var PHOTO_ALIAS = {
	economics: "mathematics",
	accounting: "hero",
	literature: "english",
	history: "government"
};
var photoOf = (subject) => subject.photo ?? `/media/${PHOTO_ALIAS[subject.id] ?? subject.id}.jpg`;
function monthLabel(value) {
	if (!value) return "";
	const [y, m] = value.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("en-NG", {
		month: "long",
		year: "numeric"
	});
}
function weeksUntil(month) {
	if (!month) return null;
	const [y, m] = month.split("-").map(Number);
	const target = new Date(y, m - 1, 1).getTime();
	const weeks = Math.ceil((target - Date.now()) / 6048e5);
	return weeks > 0 ? weeks : null;
}
//#endregion
export { weeksUntil as a, plural as i, naira as n, photoOf as r, monthLabel as t };
