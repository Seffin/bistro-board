import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveChannels = [
	{ id: 'counter', name: 'Counter', color: '#10b981' },
	{ id: 'swiggy', name: 'Swiggy', color: '#f97316' },
	{ id: 'zomato', name: 'Zomato', color: '#ef4444' }
];

const mockOrders = [
	{
		channel: 'Counter',
		status: 'Delivered',
		grand_total: 150000,
		net_payout: 150000,
		order_date: new Date('2026-01-15T10:00:00Z')
	},
	{
		channel: 'Swiggy',
		status: 'Delivered',
		grand_total: 250000,
		net_payout: 225000,
		order_date: new Date('2026-01-20T11:00:00Z')
	},
	{
		channel: 'Counter',
		status: 'Delivered',
		grand_total: 300000,
		net_payout: 300000,
		order_date: new Date('2026-02-10T12:00:00Z')
	},
	{
		channel: 'Zomato',
		status: 'Delivered',
		grand_total: 200000,
		net_payout: 180000,
		order_date: new Date('2026-02-15T13:00:00Z')
	}
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockActiveChannels))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockImplementation(() => Promise.resolve(mockOrders))
		})
	}
}));

import { load } from '../+page.server';

describe('Overview Monthly Chart Aggregations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return correct categories and series for Revenue Trends and Channel Mix', async () => {
		const result = await load();
		expect(result).toHaveProperty('charts');
		const { revenueTrends, channelMix } = result.charts;

		// Verify Categories (Jan 2026, Feb 2026)
		expect(revenueTrends.categories).toEqual(['Jan 2026', 'Feb 2026']);
		expect(channelMix.categories).toEqual(['Jan 2026', 'Feb 2026']);

		// Verify Revenue Trends Series (values in Lakhs: value / 100000)
		// Jan: Counter = 1.5 L, Swiggy = 2.5 L, Zomato = 0, Total = 4.0 L
		// Feb: Counter = 3.0 L, Swiggy = 0, Zomato = 2.0 L, Total = 5.0 L
		const counterSeries = revenueTrends.series.find((s: { name: string }) => s.name === 'Counter');
		expect(counterSeries).toBeDefined();
		expect(counterSeries!.data).toEqual([1.5, 3.0]);

		const swiggySeries = revenueTrends.series.find((s: { name: string }) => s.name === 'Swiggy');
		expect(swiggySeries).toBeDefined();
		expect(swiggySeries!.data).toEqual([2.5, 0]);

		const zomatoSeries = revenueTrends.series.find((s: { name: string }) => s.name === 'Zomato');
		expect(zomatoSeries).toBeDefined();
		expect(zomatoSeries!.data).toEqual([0, 2.0]);

		const totalSeries = revenueTrends.series.find((s: { name: string }) => s.name === 'Total');
		expect(totalSeries).toBeDefined();
		expect(totalSeries!.data).toEqual([4.0, 5.0]);

		// Verify Channel Mix Series
		expect(channelMix.series).toHaveLength(3); // Counter, Swiggy, Zomato (no Total line)
	});
});
