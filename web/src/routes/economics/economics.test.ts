import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

// Mock the database and config
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve([
					{
						order_id: '1',
						channel: 'Swiggy',
						grand_total: 1000,
						commission: 200,
						other_charges: 50,
						net_payout: 750,
						status: 'delivered',
						order_date: new Date('2026-01-15T12:00:00Z')
					},
					{
						order_id: '2',
						channel: 'Counter',
						grand_total: 500,
						commission: 0,
						other_charges: 0,
						net_payout: 500,
						status: 'delivered',
						order_date: new Date('2026-01-15T13:00:00Z')
					}
				]))
			}))
		}))
	}
}));

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn(() => Promise.resolve([
		{ id: 'swiggy', name: 'Swiggy', color: '#f97316' },
		{ id: 'counter', name: 'Counter', color: '#3b82f6' }
	]))
}));

describe('Economics Page Server Load', () => {
	it('calculates commission rates and payout ratios correctly', async () => {
		const url = new URL('http://localhost/economics');
		const result = await load({ url });

		const swiggy = result.economics.channels.find(c => c.channel_id === 'swiggy');
		expect(swiggy).toBeDefined();
		expect(swiggy?.total_gross).toBe(1000);
		expect(swiggy?.commission_rate).toBe(20); // 200/1000 * 100 = 20%
		expect(swiggy?.payout_ratio).toBe(75); // 750/1000 * 100 = 75%
		
		const counter = result.economics.channels.find(c => c.channel_id === 'counter');
		expect(counter).toBeDefined();
		expect(counter?.commission_rate).toBe(0);
		expect(counter?.payout_ratio).toBe(100);

		expect(result.economics.summary.total_gross).toBe(1500);
		expect(result.economics.monthly_trends.length).toBe(1);
	});
});
