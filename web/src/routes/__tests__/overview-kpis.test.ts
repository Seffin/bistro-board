import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveChannels = [
	{ id: 'counter', name: 'Counter', color: '#10b981' },
	{ id: 'swiggy', name: 'Swiggy', color: '#f97316' },
	{ id: 'zomato', name: 'Zomato', color: '#ef4444' }
];

const mockOrders = [
	{ channel: 'Counter', status: 'Delivered', grand_total: 500, net_payout: 500 },
	{ channel: 'Counter', status: 'Delivered', grand_total: 1500, net_payout: 1500 },
	{ channel: 'Swiggy', status: 'Delivered', grand_total: 1000, net_payout: 900 },
	{ channel: 'Zomato', status: 'Delivered', grand_total: 2000, net_payout: 1800 },
	{ channel: 'Zomato', status: 'Cancelled', grand_total: 1000, net_payout: 0 } // Cancelled, should be excluded from volume/payout
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockActiveChannels))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				where: vi.fn().mockResolvedValue(mockOrders),
				then: (resolve: any) => Promise.resolve(mockOrders).then(resolve)
			}))
		})
	}
}));

import { load } from '../+page.server';

describe('Overview KPI Server Load Function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should calculate top-level Net Payout and Revenue Retained percentage correctly', async () => {
		const result = await load();
		expect(result).toHaveProperty('kpis');
		// Total Net Payout = 500 + 1500 + 900 + 1800 = 4700
		expect(result.kpis.netPayout).toBe(4700);

		// Total Gross = 500 + 1500 + 1000 + 2000 = 5000 (excluding cancelled)
		// Revenue Retained = (4700 / 5000) * 100 = 94%
		expect(result.kpis.revenueRetainedPct).toBe(94);
	});

	it('should calculate Total Volume and Success Rate correctly', async () => {
		const result = await load();
		// Total successful orders = 4
		expect(result.kpis.totalVolume).toBe(4);

		// Total orders = 5, successful = 4 => Success Rate = (4/5) * 100 = 80%
		expect(result.kpis.successRatePct).toBe(80);
	});

	it('should calculate per-channel Gross Sales, Order Count, and Ticket AOV correctly', async () => {
		const result = await load();
		const stats = result.kpis.channelStats;

		expect(stats['counter']).toEqual({
			grossSales: 2000,
			orderCount: 2,
			aov: 1000
		});

		expect(stats['swiggy']).toEqual({
			grossSales: 1000,
			orderCount: 1,
			aov: 1000
		});

		expect(stats['zomato']).toEqual({
			grossSales: 2000,
			orderCount: 1,
			aov: 2000
		});
	});
});
