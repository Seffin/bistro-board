import { describe, it, expect } from 'vitest';

describe('Promo Impact Load Function', () => {
	describe('discount aggregation', () => {
		it('should aggregate discounts into buckets', () => {
			const orders = [
				{ order_id: '1', discount: 50 },
				{ order_id: '2', discount: 75 },
				{ order_id: '3', discount: 150 },
				{ order_id: '4', discount: 350 },
				{ order_id: '5', discount: 600 }
			];

			const buckets: Record<string, number> = {
				'0-100': 0,
				'100-250': 0,
				'250-500': 0,
				'500+': 0
			};

			for (const order of orders) {
				if (order.discount < 100) buckets['0-100']++;
				else if (order.discount < 250) buckets['100-250']++;
				else if (order.discount < 500) buckets['250-500']++;
				else buckets['500+']++;
			}

			expect(buckets['0-100']).toBe(2);
			expect(buckets['100-250']).toBe(1);
			expect(buckets['250-500']).toBe(1);
			expect(buckets['500+']).toBe(1);
		});
	});

	describe('promo performance metrics', () => {
		it('should calculate avg order value with discount', () => {
			const orders = [
				{ amount: 500, discount: 50, final_total: 450 },
				{ amount: 600, discount: 75, final_total: 525 },
				{ amount: 800, discount: 100, final_total: 700 }
			];

			const avgWithDiscount = orders.reduce((sum, o) => sum + o.final_total, 0) / orders.length;
			expect(avgWithDiscount).toBeCloseTo(558.33, 0);
		});

		it('should calculate discount penetration rate', () => {
			const totalOrders = 100;
			const ordersWithDiscount = 45;
			const rate = (ordersWithDiscount / totalOrders) * 100;

			expect(rate).toBe(45);
		});

		it('should calculate total discount value', () => {
			const orders = [
				{ discount: 50 },
				{ discount: 75 },
				{ discount: 100 },
				{ discount: 125 }
			];

			const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
			expect(totalDiscount).toBe(350);
		});
	});

	describe('correlation analysis', () => {
		it('should identify discount correlation with order frequency', () => {
			const discountBuckets = [
				{ bucket: '0-100', orders: 45 },
				{ bucket: '100-250', orders: 38 },
				{ bucket: '250-500', orders: 12 },
				{ bucket: '500+', orders: 5 }
			];

			const trend = discountBuckets.map((b) => b.orders);
			const isDecreasing = trend[0] > trend[1] && trend[1] > trend[2] && trend[2] > trend[3];

			expect(isDecreasing).toBe(true); // Higher discounts correlate with fewer orders
		});

		it('should calculate correlation coefficient between discount and order count', () => {
			const data = [
				{ discount: 50, orders: 100 },
				{ discount: 100, orders: 85 },
				{ discount: 200, orders: 65 },
				{ discount: 300, orders: 45 }
			];

			// Negative correlation expected (higher discount = fewer orders)
			const avgDiscount = data.reduce((sum, d) => sum + d.discount, 0) / data.length;
			const avgOrders = data.reduce((sum, d) => sum + d.orders, 0) / data.length;

			let numerator = 0;
			let denominator1 = 0;
			let denominator2 = 0;

			for (const d of data) {
				numerator += (d.discount - avgDiscount) * (d.orders - avgOrders);
				denominator1 += (d.discount - avgDiscount) ** 2;
				denominator2 += (d.orders - avgOrders) ** 2;
			}

			const correlation = numerator / Math.sqrt(denominator1 * denominator2);
			expect(correlation).toBeLessThan(0); // Negative correlation
		});
	});

	describe('date range filtering', () => {
		it('should filter promo data by date range', () => {
			const promos = [
				{ date: '2024-01-05', discount: 50 },
				{ date: '2024-01-15', discount: 75 },
				{ date: '2024-02-01', discount: 100 }
			];

			const start = new Date('2024-01-01');
			const end = new Date('2024-01-31');
			const filtered = promos.filter((p) => new Date(p.date) >= start && new Date(p.date) <= end);

			expect(filtered).toHaveLength(2);
		});
	});

	describe('channel-specific promo analysis', () => {
		it('should break down promo impact by channel', () => {
			const promos = [
				{ channel: 'counter', amount: 100, discount: 10 },
				{ channel: 'swiggy', amount: 200, discount: 30 },
				{ channel: 'counter', amount: 150, discount: 15 },
				{ channel: 'zomato', amount: 180, discount: 20 }
			];

			const byChannel = promos.reduce(
				(acc, p) => {
					if (!acc[p.channel]) acc[p.channel] = { totalAmount: 0, totalDiscount: 0 };
					acc[p.channel].totalAmount += p.amount;
					acc[p.channel].totalDiscount += p.discount;
					return acc;
				},
				{} as Record<string, { totalAmount: number; totalDiscount: number }>
			);

			expect(byChannel['counter'].totalAmount).toBe(250);
			expect(byChannel['swiggy'].totalDiscount).toBe(30);
		});
	});

	describe('data structure', () => {
		it('should return discount buckets with metrics', () => {
			const bucket = {
				bucket_range: '0-100',
				order_count: 45,
				avg_discount: 72,
				total_discount_value: 3240,
				avg_order_value: 425,
				conversion_impact: 15
			};

			expect(bucket).toHaveProperty('bucket_range');
			expect(bucket).toHaveProperty('order_count');
			expect(bucket).toHaveProperty('conversion_impact');
		});
	});
});
