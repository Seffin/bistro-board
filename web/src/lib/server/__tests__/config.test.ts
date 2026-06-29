import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveChannels = [
	{
		id: 'counter',
		name: 'Counter',
		color: '#10b981',
		import_folder: 'sales_reports/counter',
		email_keywords: '["Counter","POS"]',
		is_active: true,
		created_at: new Date(),
		updated_at: new Date()
	},
	{
		id: 'swiggy',
		name: 'Swiggy',
		color: '#f97316',
		import_folder: 'sales_reports/swiggy',
		email_keywords: '["Annexure","Settlement"]',
		is_active: true,
		created_at: new Date(),
		updated_at: new Date()
	}
];

const mockSwiggy = {
	id: 'swiggy',
	name: 'Swiggy',
	color: '#f97316',
	import_folder: 'sales_reports/swiggy',
	email_keywords: '["Annexure","Settlement"]',
	is_active: true,
	created_at: new Date(),
	updated_at: new Date()
};

// Track what queries return based on call pattern
let selectResults: unknown[] = mockActiveChannels;

// Mock the database module with chainable select().from().where() pattern
vi.mock('$lib/server/db', () => {
	return {
		db: {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockImplementation(() => {
						return Promise.resolve(selectResults);
					})
				})
			})
		}
	};
});

import { getAllChannels, getChannelById } from '$lib/server/config';

describe('configuration service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectResults = mockActiveChannels;
	});

	describe('getAllChannels()', () => {
		it('should return an array of channels', async () => {
			const channels = await getAllChannels();
			expect(Array.isArray(channels)).toBe(true);
		});

		it('should return only active channels', async () => {
			const channels = await getAllChannels();
			// Mock returns only 2 active channels (zomato excluded)
			expect(channels).toHaveLength(2);
			expect(channels.every((c) => c.is_active)).toBe(true);
		});

		it('should return channels with expected properties', async () => {
			const channels = await getAllChannels();
			for (const channel of channels) {
				expect(channel).toHaveProperty('id');
				expect(channel).toHaveProperty('name');
				expect(channel).toHaveProperty('color');
				expect(channel).toHaveProperty('is_active');
			}
		});
	});

	describe('getChannelById()', () => {
		it('should return a channel object when found', async () => {
			selectResults = [mockSwiggy];
			const channel = await getChannelById('swiggy');
			expect(channel).toBeDefined();
			expect(channel!.id).toBe('swiggy');
		});

		it('should return a channel with correct properties', async () => {
			selectResults = [mockSwiggy];
			const channel = await getChannelById('swiggy');
			expect(channel).toHaveProperty('id');
			expect(channel).toHaveProperty('name');
			expect(channel).toHaveProperty('color');
		});

		it('should return undefined when channel not found', async () => {
			selectResults = [];
			const channel = await getChannelById('nonexistent');
			expect(channel).toBeUndefined();
		});
	});
});
