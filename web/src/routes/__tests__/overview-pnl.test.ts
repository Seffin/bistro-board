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
		grand_total: 400000,
		net_payout: 400000,
		order_date: new Date('2026-01-15T10:00:00Z')
	},
	{
		channel: 'Swiggy',
		status: 'Delivered',
		grand_total: 600000,
		net_payout: 540000,
		order_date: new Date('2026-02-20T11:00:00Z')
	}
];

const mockExpenses = [
	{ date: '2026-01-10', category: 'Cost of Goods Sold', amount: 200000 },
	{ date: '2026-01-25', category: 'Salaries', amount: 100000 },
	{ date: '2026-02-15', category: 'Cost of Goods Sold', amount: 300000 },
	{ date: '2026-02-28', category: 'Marketing', amount: 150000 }
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockActiveChannels))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockImplementation((table: any) => {
				// Drizzle table objects or names
				if (table && table[Symbol.for('drizzle:Name')] === 'expenses') {
					return Promise.resolve(mockExpenses);
				}
				return Promise.resolve(mockOrders);
			})
		})
	}
}));

import { load } from '../+page.server';

describe('Overview P&L and Expense Aggregations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should calculate correct monthly Revenue, Expenses, and Profit series for P&L Combo Chart', async () => {
		const result = await load();
		expect(result).toHaveProperty('charts');
		const { pnlTrends, expenseBreakdown } = result.charts;

		// Verify Categories (Jan 2026, Feb 2026)
		expect(pnlTrends.categories).toEqual(['Jan 2026', 'Feb 2026']);

		// Jan: Revenue = 4.0 L, Expenses = 2.0 + 1.0 = 3.0 L, Profit = 1.0 L
		// Feb: Revenue = 6.0 L, Expenses = 3.0 + 1.5 = 4.5 L, Profit = 1.5 L
		const revenueSeries = pnlTrends.series.find((s: { name: string }) => s.name === 'Revenue');
		expect(revenueSeries).toBeDefined();
		expect(revenueSeries!.data).toEqual([4.0, 6.0]);

		const expenseSeries = pnlTrends.series.find((s: { name: string }) => s.name === 'Expenses');
		expect(expenseSeries).toBeDefined();
		expect(expenseSeries!.data).toEqual([3.0, 4.5]);

		const profitSeries = pnlTrends.series.find((s: { name: string }) => s.name === 'Profit');
		expect(profitSeries).toBeDefined();
		expect(profitSeries!.data).toEqual([1.0, 1.5]);

		// Verify Expense Breakdown Donut Chart (values in Lakhs)
		// Cost of Goods Sold = 2.0 + 3.0 = 5.0 L
		// Salaries = 1.0 L
		// Marketing = 1.5 L
		expect(expenseBreakdown.labels).toEqual(['Cost of Goods Sold', 'Salaries', 'Marketing']);
		expect(expenseBreakdown.series).toEqual([5.0, 1.0, 1.5]);
	});
});
