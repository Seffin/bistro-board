import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveChannels = [
	{ id: 'counter', name: 'Counter', color: '#10b981' },
	{ id: 'swiggy', name: 'Swiggy', color: '#f97316' }
];

const mockOrdersAll = [
	{ channel: 'Counter', status: 'Delivered', grand_total: 200000, net_payout: 200000, order_date: new Date('2026-01-15T12:30:00Z') },
	{ channel: 'Swiggy', status: 'Delivered', grand_total: 300000, net_payout: 270000, order_date: new Date('2026-04-16T19:45:00Z') }
];

const mockOrdersFiltered = [
	{ channel: 'Swiggy', status: 'Delivered', grand_total: 300000, net_payout: 270000, order_date: new Date('2026-04-16T19:45:00Z') }
];

vi.mock('$lib/server/config', () => ({
	getAllChannels: vi.fn().mockImplementation(() => Promise.resolve(mockActiveChannels))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockImplementation((table: any) => {
				const isExpenses = table && table[Symbol.for('drizzle:Name')] === 'expenses';
				const resObj = {
					where: vi.fn().mockImplementation(() => {
						return Promise.resolve(isExpenses ? [] : mockOrdersFiltered);
					}),
					then: (onFulfilled: any) => {
						return Promise.resolve(isExpenses ? [] : mockOrdersAll).then(onFulfilled);
					}
				};
				return resObj;
			})
		})
	}
}));

import { load, actions } from '../+page.server';

describe('Overview Date Filtering and Sync Form Action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return all orders when no start and end parameters are provided', async () => {
		const url = new URL('http://localhost/');
		const result = await load({ url });
		expect(result.kpis.totalVolume).toBe(2);
		expect(result.kpis.netPayout).toBe(470000);
	});

	it('should return filtered orders when start and end parameters are provided', async () => {
		const url = new URL('http://localhost/?start=2026-04-01&end=2026-04-30');
		const result = await load({ url });
		expect(result.kpis.totalVolume).toBe(1);
		expect(result.kpis.netPayout).toBe(270000);
	});

	it('should execute sync form action successfully', async () => {
		expect(actions).toBeDefined();
		expect(actions.sync).toBeDefined();

		const result = await actions.sync();
		expect(result).toEqual({
			success: true,
			message: 'Data sync completed successfully'
		});
	});
});
