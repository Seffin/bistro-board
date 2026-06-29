import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChannels = [
	{ id: 'counter', name: 'Counter', color: '#10b981', is_active: true },
	{ id: 'swiggy', name: 'Swiggy', color: '#f97316', is_active: true }
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockChannels))
}));

// We'll import load from +page.server which we are about to create.
import { load } from '../+page.server';

describe('Settings Page Load Function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return channels for the settings tabs', async () => {
		const result = await load();
		expect(result).toBeDefined();
		expect(result.channels).toEqual(mockChannels);
	});
});
