import { describe, it, expect, vi } from 'vitest';

// Mock the config service — vi.mock is hoisted, so factory must be self-contained
vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockResolvedValue([
		{ id: 'counter', name: 'Counter', color: '#10b981', is_active: true },
		{ id: 'swiggy', name: 'Swiggy', color: '#f97316', is_active: true }
	])
}));

import { load } from '../+layout.server';

describe('+layout.server.ts load function', () => {
	it('should return a channels array', async () => {
		const result = await load();
		expect(result).toHaveProperty('channels');
		expect(Array.isArray(result.channels)).toBe(true);
	});

	it('should return channel objects with id, name, and color', async () => {
		const result = await load();
		for (const channel of result.channels) {
			expect(channel).toHaveProperty('id');
			expect(channel).toHaveProperty('name');
			expect(channel).toHaveProperty('color');
		}
	});

	it('should return the correct number of active channels', async () => {
		const result = await load();
		expect(result.channels).toHaveLength(2);
	});
});
