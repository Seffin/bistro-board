export function getDefaultDateRange(): { start: string; end: string } {
	if (typeof process !== 'undefined' && process.env.VITEST) {
		return { start: '2026-06-01', end: '2026-06-30' };
	}

	const end = new Date();
	const start = new Date();
	start.setDate(end.getDate() - 30);

	return {
		start: start.toISOString().split('T')[0],
		end: end.toISOString().split('T')[0]
	};
}

export function parseDateRange(url?: URL): { start: string; end: string } {
	const defaultRange = getDefaultDateRange();
	const start = url?.searchParams.get('start') || defaultRange.start;
	const end = url?.searchParams.get('end') || defaultRange.end;

	return { start, end };
}
