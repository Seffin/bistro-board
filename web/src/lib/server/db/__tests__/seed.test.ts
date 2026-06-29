import { describe, it, expect } from 'vitest';

// This import will fail until we create the seed module — RED phase
import { DEFAULT_CHANNELS } from '$lib/server/db/seed-data';

describe('seed-data module', () => {
	it('should export DEFAULT_CHANNELS array', () => {
		expect(Array.isArray(DEFAULT_CHANNELS)).toBe(true);
	});

	it('should contain exactly 3 default channels', () => {
		expect(DEFAULT_CHANNELS).toHaveLength(3);
	});

	it('should have Counter, Swiggy, and Zomato by name', () => {
		const names = DEFAULT_CHANNELS.map((c) => c.name);
		expect(names).toContain('Counter');
		expect(names).toContain('Swiggy');
		expect(names).toContain('Zomato');
	});

	it('should match colors from decoupling_plan.md', () => {
		const colorMap = Object.fromEntries(DEFAULT_CHANNELS.map((c) => [c.id, c.color]));
		expect(colorMap['counter']).toBe('#10b981');
		expect(colorMap['swiggy']).toBe('#f97316');
		expect(colorMap['zomato']).toBe('#ef4444');
	});

	it('should match import folders from existing sales_reports/ structure', () => {
		const folderMap = Object.fromEntries(DEFAULT_CHANNELS.map((c) => [c.id, c.import_folder]));
		expect(folderMap['counter']).toBe('sales_reports/counter');
		expect(folderMap['swiggy']).toBe('sales_reports/swiggy');
		expect(folderMap['zomato']).toBe('sales_reports/zomato');
	});
});
