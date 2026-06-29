import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveChannels = [
	{ id: 'counter', name: 'Counter', color: '#10b981' },
	{ id: 'swiggy', name: 'Swiggy', color: '#f97316' },
	{ id: 'zomato', name: 'Zomato', color: '#ef4444' }
];

// Thursday 2026-01-15T12:30:00Z (Hour 12, Thu)
// Friday 2026-01-16T19:45:00Z (Hour 19, Fri)
// Sunday 2026-01-18T21:15:00Z (Hour 21, Sun)
const mockOrders = [
	{ channel: 'Counter', status: 'Delivered', grand_total: 200000, net_payout: 200000, order_date: new Date('2026-01-15T12:30:00Z') },
	{ channel: 'Swiggy', status: 'Delivered', grand_total: 300000, net_payout: 270000, order_date: new Date('2026-01-16T19:45:00Z') },
	{ channel: 'Zomato', status: 'Delivered', grand_total: 500000, net_payout: 450000, order_date: new Date('2026-01-18T21:15:00Z') }
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockActiveChannels))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockImplementation((table: any) => {
				const isExpense = table && table[Symbol.for('drizzle:Name')] === 'expenses';
				const data = isExpense ? [] : mockOrders;
				return {
					where: vi.fn().mockResolvedValue(data),
					then: (resolve) => resolve(data)
				};
			})
		})
	}
}));

import { load } from '../+page.server';

describe('Overview Velocity and Performance Aggregations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should calculate correct hourly velocity, weekly performance, and monthly contribution series', async () => {
		const result = await load();
		expect(result).toHaveProperty('charts');
		const { hourlyVelocity, weeklyPerformance, monthlyContribution } = result.charts;

		// Verify Hourly Velocity Categories (11:00 to 22:00)
		expect(hourlyVelocity.categories).toEqual([
			'11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
			'17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
		]);

		// Verify Hourly Volume Data
		// Hour 12 (index 1) = 1 order
		// Hour 19 (index 8) = 1 order
		// Hour 21 (index 10) = 1 order
		expect(hourlyVelocity.series[0].data[1]).toBe(1);
		expect(hourlyVelocity.series[0].data[8]).toBe(1);
		expect(hourlyVelocity.series[0].data[10]).toBe(1);

		// Verify Weekly Performance Categories (Mon to Sun)
		expect(weeklyPerformance.categories).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

		// Verify Weekly Revenue Data (in Lakhs)
		// Thu (index 3) = 2.0 L
		// Fri (index 4) = 3.0 L
		// Sun (index 6) = 5.0 L
		expect(weeklyPerformance.series[0].data[3]).toBe(2.0);
		expect(weeklyPerformance.series[0].data[4]).toBe(3.0);
		expect(weeklyPerformance.series[0].data[6]).toBe(5.0);

		// Verify Monthly Contribution (Donut chart by channel in Lakhs)
		// Counter = 2.0 L, Swiggy = 3.0 L, Zomato = 5.0 L
		expect(monthlyContribution.labels).toEqual(['Counter', 'Swiggy', 'Zomato']);
		expect(monthlyContribution.series).toEqual([2.0, 3.0, 5.0]);
		expect(monthlyContribution.colors).toEqual(['#10b981', '#f97316', '#ef4444']);
	});
});
