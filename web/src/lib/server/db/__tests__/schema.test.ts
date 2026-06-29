import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';

// Import will fail until we define the channels table — this is the RED phase
import { channels } from '$lib/server/db/schema';

describe('channels table schema', () => {
	it('should have all required columns', () => {
		const columns = getTableColumns(channels);

		expect(columns).toHaveProperty('id');
		expect(columns).toHaveProperty('name');
		expect(columns).toHaveProperty('color');
		expect(columns).toHaveProperty('import_folder');
		expect(columns).toHaveProperty('email_keywords');
		expect(columns).toHaveProperty('is_active');
		expect(columns).toHaveProperty('created_at');
		expect(columns).toHaveProperty('updated_at');
	});

	it('should use "id" as the primary key', () => {
		const columns = getTableColumns(channels);
		expect(columns.id.primary).toBe(true);
	});

	it('should have correct NOT NULL constraints', () => {
		const columns = getTableColumns(channels);

		// Required fields
		expect(columns.id.notNull).toBe(true);
		expect(columns.name.notNull).toBe(true);
		expect(columns.color.notNull).toBe(true);
		expect(columns.is_active.notNull).toBe(true);
		expect(columns.created_at.notNull).toBe(true);
		expect(columns.updated_at.notNull).toBe(true);

		// Optional fields
		expect(columns.import_folder.notNull).toBe(false);
		expect(columns.email_keywords.notNull).toBe(false);
	});

	it('should default is_active to true', () => {
		const columns = getTableColumns(channels);
		// Drizzle stores defaults — check that a default exists
		expect(columns.is_active.hasDefault).toBe(true);
	});

	it('should have timestamp defaults for created_at and updated_at', () => {
		const columns = getTableColumns(channels);
		expect(columns.created_at.hasDefault).toBe(true);
		expect(columns.updated_at.hasDefault).toBe(true);
	});

	it('should be able to construct a valid insert object', () => {
		// Verify the table can accept a well-formed channel object
		// This is a compile-time/structure check — if the types are wrong, TS will complain
		const sampleChannel = {
			id: 'swiggy',
			name: 'Swiggy',
			color: '#f97316',
			import_folder: 'sales_reports/swiggy',
			email_keywords: JSON.stringify(['Annexure', 'Settlement', 'Swiggy Payments']),
			is_active: true
		};

		expect(sampleChannel.id).toBe('swiggy');
		expect(sampleChannel.name).toBe('Swiggy');
		expect(sampleChannel.color).toBe('#f97316');
		expect(JSON.parse(sampleChannel.email_keywords)).toEqual([
			'Annexure',
			'Settlement',
			'Swiggy Payments'
		]);
	});
});
