require('dotenv').config();

function getStartDate() {
	// Format: YYYY-MM-DD
	const d = process.env.EXHIBITION_START_DATE || '2025-09-17';
	return d;
}

function getDateForDay(day) {
	if (!day) return null;
	const start = new Date(getStartDate());
	if (Number.isNaN(start.getTime())) return null;
	const idx = Number(day);
	if (!Number.isFinite(idx) || idx < 1) return null;
	const date = new Date(start);
	date.setDate(start.getDate() + (idx - 1));
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

module.exports = { getStartDate, getDateForDay };


