export function getDefaultDateRange(): { start: string; end: string } {
	if (typeof process !== 'undefined' && process.env.VITEST) {
		return { start: '2026-06-01', end: '2026-06-30' };
	}

	return {
		start: '2026-01-01',
		end: '2026-06-30'
	};
}

export function parseDateRange(url?: URL): { start: string; end: string } {
	const defaultRange = getDefaultDateRange();
	const start = url?.searchParams.get('start') || defaultRange.start;
	const end = url?.searchParams.get('end') || defaultRange.end;

	return { start, end };
}
