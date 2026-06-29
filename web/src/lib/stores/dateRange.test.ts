import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDateRangeStore,
	createIsDateRangeActiveDerived,
	formatDateRange,
	buildURLWithDateRange
} from '../stores/dateRange';
import { get } from 'svelte/store';

describe('dateRange store', () => {
	describe('createDateRangeStore', () => {
		it('should initialize with empty strings by default', () => {
			const store = createDateRangeStore();
			const value = get(store);
			expect(value.start).toBe('');
			expect(value.end).toBe('');
		});

		it('should initialize with provided values', () => {
			const store = createDateRangeStore('2026-01-01', '2026-05-31');
			const value = get(store);
			expect(value.start).toBe('2026-01-01');
			expect(value.end).toBe('2026-05-31');
		});

		it('should set new date range values', () => {
			const store = createDateRangeStore();
			store.set('2026-02-01', '2026-02-28');
			const value = get(store);
			expect(value.start).toBe('2026-02-01');
			expect(value.end).toBe('2026-02-28');
		});

		it('should reset to empty strings', () => {
			const store = createDateRangeStore('2026-01-01', '2026-05-31');
			store.reset();
			const value = get(store);
			expect(value.start).toBe('');
			expect(value.end).toBe('');
		});

		it('should sync from URL search parameters', () => {
			const store = createDateRangeStore();
			const url = new URL('http://localhost?start=2026-03-01&end=2026-03-31');
			store.setFromURL(url);
			const value = get(store);
			expect(value.start).toBe('2026-03-01');
			expect(value.end).toBe('2026-03-31');
		});

		it('should handle URL with missing start parameter', () => {
			const store = createDateRangeStore();
			const url = new URL('http://localhost?end=2026-03-31');
			store.setFromURL(url);
			const value = get(store);
			expect(value.start).toBe('');
			expect(value.end).toBe('2026-03-31');
		});

		it('should handle URL with missing end parameter', () => {
			const store = createDateRangeStore();
			const url = new URL('http://localhost?start=2026-03-01');
			store.setFromURL(url);
			const value = get(store);
			expect(value.start).toBe('2026-03-01');
			expect(value.end).toBe('');
		});

		it('should handle URL with no date parameters', () => {
			const store = createDateRangeStore();
			const url = new URL('http://localhost');
			store.setFromURL(url);
			const value = get(store);
			expect(value.start).toBe('');
			expect(value.end).toBe('');
		});

		it('should update store with function', () => {
			const store = createDateRangeStore('2026-01-01', '2026-01-31');
			store.update((current) => ({
				...current,
				end: '2026-02-28'
			}));
			const value = get(store);
			expect(value.start).toBe('2026-01-01');
			expect(value.end).toBe('2026-02-28');
		});
	});

	describe('isDateRangeActive derived store', () => {
		it('should return false when both dates are empty', () => {
			const store = createDateRangeStore('', '');
			const activeStore = createIsDateRangeActiveDerived(store);
			const active = get(activeStore);
			expect(active).toBe(false);
		});

		it('should return false when start date is empty', () => {
			const store = createDateRangeStore('', '2026-05-31');
			const activeStore = createIsDateRangeActiveDerived(store);
			const active = get(activeStore);
			expect(active).toBe(false);
		});

		it('should return false when end date is empty', () => {
			const store = createDateRangeStore('2026-01-01', '');
			const activeStore = createIsDateRangeActiveDerived(store);
			const active = get(activeStore);
			expect(active).toBe(false);
		});

		it('should return true when both dates are set', () => {
			const store = createDateRangeStore('2026-01-01', '2026-05-31');
			const activeStore = createIsDateRangeActiveDerived(store);
			const active = get(activeStore);
			expect(active).toBe(true);
		});
	});

	describe('formatDateRange', () => {
		it('should format two dates correctly', () => {
			const result = formatDateRange('2026-01-01', '2026-05-31');
			expect(result).toContain('1/1/2026');
			expect(result).toContain('5/31/2026');
			expect(result).toContain('–');
		});

		it('should return empty string when start is empty', () => {
			const result = formatDateRange('', '2026-05-31');
			expect(result).toBe('');
		});

		it('should return empty string when end is empty', () => {
			const result = formatDateRange('2026-01-01', '');
			expect(result).toBe('');
		});

		it('should return empty string when both are empty', () => {
			const result = formatDateRange('', '');
			expect(result).toBe('');
		});
	});

	describe('buildURLWithDateRange', () => {
		beforeEach(() => {
			// Mock window.location.origin for tests
			if (typeof window !== 'undefined') {
				vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
			}
		});

		it('should build URL with date range parameters', () => {
			const url = buildURLWithDateRange('/sales', '2026-01-01', '2026-05-31');
			expect(url).toContain('start=2026-01-01');
			expect(url).toContain('end=2026-05-31');
		});

		it('should not add parameters when dates are empty', () => {
			const url = buildURLWithDateRange('/sales', '', '');
			expect(url).not.toContain('start');
			expect(url).not.toContain('end');
		});

		it('should preserve the base path', () => {
			const url = buildURLWithDateRange('/sales', '2026-01-01', '2026-05-31');
			expect(url).toContain('/sales');
		});

		it('should handle root path', () => {
			const url = buildURLWithDateRange('/', '2026-01-01', '2026-05-31');
			expect(url).toContain('start=2026-01-01');
			expect(url).toContain('end=2026-05-31');
		});
	});
});
