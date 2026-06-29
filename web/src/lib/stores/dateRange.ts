import { writable, derived, type Readable } from 'svelte/store';

export interface DateRange {
	start: string;
	end: string;
}

export interface DateRangeStore {
	subscribe: (fn: (value: DateRange) => void) => () => void;
	set: (start: string, end: string) => void;
	setFromURL: (url: URL) => void;
	update: (fn: (value: DateRange) => DateRange) => void;
	reset: () => void;
}

/**
 * Creates a writable store for the global date range.
 * The store can be synchronized with URL search parameters.
 */
export function createDateRangeStore(initialStart = '', initialEnd = ''): DateRangeStore {
	const { subscribe, set, update } = writable<DateRange>({
		start: initialStart,
		end: initialEnd
	});

	return {
		subscribe,
		set: (start: string, end: string) => {
			set({ start, end });
		},
		setFromURL: (url: URL) => {
			const start = url.searchParams.get('start') || '';
			const end = url.searchParams.get('end') || '';
			set({ start, end });
		},
		update: (fn: (value: DateRange) => DateRange) => update(fn),
		reset: () => set({ start: '', end: '' })
	};
}

/**
 * Global date range store instance
 */
export const dateRange = createDateRangeStore();

/**
 * Creates a derived store that checks if a date range is active
 */
export function createIsDateRangeActiveDerived(store: DateRangeStore): Readable<boolean> {
	return derived(store, ($dateRange) => !!($dateRange.start && $dateRange.end));
}

/**
 * Global derived store that checks if a date range is active
 */
export const isDateRangeActive = createIsDateRangeActiveDerived(dateRange);

/**
 * Helper function to format date range for display
 */
export function formatDateRange(start: string, end: string): string {
	if (!start || !end) return '';
	const startDate = new Date(start);
	const endDate = new Date(end);
	return `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
}

/**
 * Helper function to build URL with date range parameters
 */
export function buildURLWithDateRange(baseURL: string, start: string, end: string): string {
	const url = new URL(
		baseURL,
		typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
	);
	if (start && end) {
		url.searchParams.set('start', start);
		url.searchParams.set('end', end);
	}
	return url.toString();
}
