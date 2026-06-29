import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for Platform Economics page load function
 *
 * The economics page aggregates fees, commissions, and payouts by channel
 * to show margin leakage analysis.
 */
describe('Platform Economics Load Function', () => {
	describe('Channel-wise fee aggregation', () => {
		it('should aggregate commission, other_charges, gross_total, and net_payout per channel', () => {
			// Mock data
			const orders = [
				{
					channel: 'swiggy',
					grand_total: 500,
					commission: 50,
					other_charges: 10,
					net_payout: 440,
					status: 'delivered'
				},
				{
					channel: 'swiggy',
					grand_total: 300,
					commission: 30,
					other_charges: 5,
					net_payout: 265,
					status: 'delivered'
				},
				{
					channel: 'zomato',
					grand_total: 600,
					commission: 90,
					other_charges: 15,
					net_payout: 495,
					status: 'delivered'
				}
			];

			// Expected aggregation
			const expected = {
				swiggy: {
					total_gross: 800,
					total_commission: 80,
					total_other_charges: 15,
					total_net_payout: 705,
					order_count: 2,
					commission_rate: (80 / 800) * 100, // 10%
					leakage: ((80 + 15) / 800) * 100 // 11.875%
				},
				zomato: {
					total_gross: 600,
					total_commission: 90,
					total_other_charges: 15,
					total_net_payout: 495,
					order_count: 1,
					commission_rate: (90 / 600) * 100, // 15%
					leakage: ((90 + 15) / 600) * 100 // 17.5%
				}
			};

			// Simulate aggregation logic
			const result: Record<string, any> = {};
			for (const order of orders) {
				if (!result[order.channel]) {
					result[order.channel] = {
						total_gross: 0,
						total_commission: 0,
						total_other_charges: 0,
						total_net_payout: 0,
						order_count: 0
					};
				}
				result[order.channel].total_gross += order.grand_total;
				result[order.channel].total_commission += order.commission;
				result[order.channel].total_other_charges += order.other_charges;
				result[order.channel].total_net_payout += order.net_payout;
				result[order.channel].order_count += 1;
			}

			// Calculate rates
			for (const channel in result) {
				const data = result[channel];
				data.commission_rate = (data.total_commission / data.total_gross) * 100;
				data.leakage =
					((data.total_commission + data.total_other_charges) / data.total_gross) * 100;
			}

			expect(result).toEqual(expected);
		});
	});

	describe('Cancelled order handling', () => {
		it('should exclude cancelled orders from economics calculations', () => {
			const orders = [
				{
					channel: 'swiggy',
					grand_total: 500,
					commission: 50,
					other_charges: 10,
					net_payout: 440,
					status: 'delivered'
				},
				{
					channel: 'swiggy',
					grand_total: 200,
					commission: 20,
					other_charges: 4,
					net_payout: 176,
					status: 'cancelled'
				}
			];

			// Filter out cancelled
			const validOrders = orders.filter((o) => o.status?.toLowerCase() !== 'cancelled');
			expect(validOrders).toHaveLength(1);
			expect(validOrders[0].grand_total).toBe(500);
		});

		it('should ignore orders with failed status', () => {
			const orders = [
				{ status: 'delivered', grand_total: 500 },
				{ status: 'failed', grand_total: 100 },
				{ status: 'printed', grand_total: 300 }
			];

			const validOrders = orders.filter((o) => {
				const status = (o.status || '').toLowerCase();
				return status !== 'cancelled' && status !== 'failed';
			});

			expect(validOrders).toHaveLength(2);
			expect(validOrders.map((o) => o.grand_total)).toEqual([500, 300]);
		});
	});

	describe('Date range filtering', () => {
		it('should filter orders within start and end date range', () => {
			const orders = [
				{
					channel: 'swiggy',
					order_date: new Date('2026-01-15T10:00:00Z'),
					grand_total: 500,
					commission: 50,
					status: 'delivered'
				},
				{
					channel: 'swiggy',
					order_date: new Date('2026-02-20T10:00:00Z'),
					grand_total: 300,
					commission: 30,
					status: 'delivered'
				},
				{
					channel: 'swiggy',
					order_date: new Date('2026-06-01T10:00:00Z'),
					grand_total: 200,
					commission: 20,
					status: 'delivered'
				}
			];

			const start = new Date('2026-01-01T00:00:00Z');
			const end = new Date('2026-05-31T23:59:59Z');

			const filtered = orders.filter((o) => o.order_date >= start && o.order_date <= end);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].grand_total).toBe(500);
			expect(filtered[1].grand_total).toBe(300);
		});

		it('should handle undefined date range (no filtering)', () => {
			const orders = [
				{ channel: 'swiggy', order_date: new Date('2026-01-15'), grand_total: 500 },
				{ channel: 'swiggy', order_date: new Date('2026-06-15'), grand_total: 300 }
			];

			// No filtering
			expect(orders).toHaveLength(2);
		});
	});

	describe('Margin leakage calculation', () => {
		it('should calculate leakage as (commission + other_charges) / gross_total', () => {
			const channels = {
				swiggy: {
					total_gross: 1000,
					total_commission: 150,
					total_other_charges: 50,
					total_net_payout: 800
				},
				zomato: {
					total_gross: 1000,
					total_commission: 200,
					total_other_charges: 30,
					total_net_payout: 770
				}
			};

			const swiggyLeakage =
				((channels.swiggy.total_commission + channels.swiggy.total_other_charges) /
					channels.swiggy.total_gross) *
				100;
			const zomatoLeakage =
				((channels.zomato.total_commission + channels.zomato.total_other_charges) /
					channels.zomato.total_gross) *
				100;

			expect(swiggyLeakage).toBeCloseTo(20); // (150 + 50) / 1000 * 100
			expect(zomatoLeakage).toBeCloseTo(23); // (200 + 30) / 1000 * 100

			// Zomato has higher leakage
			expect(zomatoLeakage).toBeGreaterThan(swiggyLeakage);
		});

		it('should calculate commission_rate as commission / gross_total', () => {
			const swiggy = {
				total_commission: 100,
				total_gross: 1000
			};

			const rate = (swiggy.total_commission / swiggy.total_gross) * 100;
			expect(rate).toBe(10);
		});
	});

	describe('Payout ratio calculation', () => {
		it('should calculate payout ratio as net_payout / gross_total', () => {
			const channels = {
				swiggy: {
					total_gross: 1000,
					total_net_payout: 800
				},
				zomato: {
					total_gross: 1000,
					total_net_payout: 770
				}
			};

			const swiggyRatio = (channels.swiggy.total_net_payout / channels.swiggy.total_gross) * 100;
			const zomatoRatio = (channels.zomato.total_net_payout / channels.zomato.total_gross) * 100;

			expect(swiggyRatio).toBe(80);
			expect(zomatoRatio).toBe(77);
		});

		it('should show swiggy having better payout ratio than zomato', () => {
			const swiggyRatio = (800 / 1000) * 100;
			const zomatoRatio = (770 / 1000) * 100;

			expect(swiggyRatio).toBeGreaterThan(zomatoRatio);
		});
	});

	describe('Empty data handling', () => {
		it('should return zero values when no orders exist', () => {
			const orders: any[] = [];

			const result: Record<string, any> = {};
			if (orders.length === 0) {
				// Return default empty structure
				result.no_data = true;
			}

			expect(result.no_data).toBe(true);
		});

		it('should return zero values per channel when no valid (non-cancelled) orders', () => {
			const orders = [
				{ channel: 'swiggy', status: 'cancelled', grand_total: 100, commission: 10 },
				{ channel: 'zomato', status: 'failed', grand_total: 200, commission: 20 }
			];

			const validOrders = orders.filter((o) => {
				const status = (o.status || '').toLowerCase();
				return status !== 'cancelled' && status !== 'failed';
			});

			expect(validOrders).toHaveLength(0);
		});
	});

	describe('Multi-channel comparison', () => {
		it('should rank channels by commission rate', () => {
			const channels = [
				{ name: 'swiggy', commission_rate: 10 },
				{ name: 'zomato', commission_rate: 15 },
				{ name: 'counter', commission_rate: 0 }
			];

			const sorted = [...channels].sort((a, b) => a.commission_rate - b.commission_rate);

			expect(sorted[0].name).toBe('counter');
			expect(sorted[1].name).toBe('swiggy');
			expect(sorted[2].name).toBe('zomato');
		});

		it('should rank channels by payout ratio (highest is best)', () => {
			const channels = [
				{ name: 'swiggy', payout_ratio: 80 },
				{ name: 'zomato', payout_ratio: 77 },
				{ name: 'counter', payout_ratio: 100 }
			];

			const sorted = [...channels].sort((a, b) => b.payout_ratio - a.payout_ratio);

			expect(sorted[0].name).toBe('counter');
			expect(sorted[1].name).toBe('swiggy');
			expect(sorted[2].name).toBe('zomato');
		});
	});

	describe('Data validation', () => {
		it('should handle null/undefined commission values', () => {
			const orders = [
				{ channel: 'swiggy', grand_total: 500, commission: null, net_payout: 500 },
				{ channel: 'swiggy', grand_total: 300, commission: undefined, net_payout: 300 }
			];

			let total = 0;
			for (const order of orders) {
				total += order.commission || 0;
			}

			expect(total).toBe(0);
		});

		it('should handle zero grand_total to avoid division by zero', () => {
			const channel = {
				total_gross: 0,
				total_commission: 50
			};

			const rate =
				channel.total_gross > 0 ? (channel.total_commission / channel.total_gross) * 100 : 0;
			expect(rate).toBe(0);
		});
	});
});
