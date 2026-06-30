import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve([
					{
						date: '2026-01-15',
						petpooja_net: 5000,
						swiggy_payout: 3000,
						zomato_payout: 2000,
						total_income: 10000
					},
					{
						date: '2026-01-14',
						petpooja_net: 4000,
						swiggy_payout: 2000,
						zomato_payout: 1000,
						total_income: 7000
					}
				]))
			}))
		}))
	}
}));

describe('Ledger Page Server Load', () => {
	it('maps income_register schema columns correctly and calculates totals', async () => {
		const url = new URL('http://localhost/ledger');
		const result = await load({ url });

		// Test summary calculation
		expect(result.ledger.summary.total_income).toBe(17000);
		expect(result.ledger.summary.days).toBe(2);

		// Test daily breakdown mapping
		const day1 = result.ledger.daily_breakdown.find(d => d.date === '2026-01-15');
		expect(day1).toBeDefined();
		expect(day1?.counter).toBe(5000);
		expect(day1?.swiggy).toBe(3000);
		expect(day1?.zomato).toBe(2000);
		expect(day1?.total).toBe(10000);
		
		// Other should be 0 because 5000+3000+2000 = 10000
		expect(day1?.other).toBe(0);
	});
});
