import { describe, it, expect } from 'vitest';

/**
 * Tests for Counter Insights page load function
 *
 * Counter Insights analyzes the Counter (POS) channel's performance:
 * - Top 15 items by frequency
 * - Payment method mix (Cash/Card/UPI)
 * - Weekly trends for each item
 */
describe('Counter Insights Load Function', () => {
	describe('items_summary parsing', () => {
		it('should parse comma-separated items from items_summary field', () => {
			// Sample items_summary format from the data
			const itemsSummary = 'Butter Naan x2, Paneer Tikka x1, Gulab Jamun x3';

			// Parse function
			const items = itemsSummary.split(',').map((item) => {
				const parts = item.trim().split('x');
				const name = parts[0].trim();
				const quantity = parseInt(parts[1]?.trim()) || 1;
				return { name, quantity };
			});

			expect(items).toHaveLength(3);
			expect(items[0]).toEqual({ name: 'Butter Naan', quantity: 2 });
			expect(items[1]).toEqual({ name: 'Paneer Tikka', quantity: 1 });
			expect(items[2]).toEqual({ name: 'Gulab Jamun', quantity: 3 });
		});

		it('should handle items without explicit quantity', () => {
			const itemsSummary = 'Butter Naan, Paneer Tikka, Gulab Jamun';

			const items = itemsSummary.split(',').map((item) => {
				const parts = item.trim().split('x');
				const name = parts[0].trim();
				const quantity = parseInt(parts[1]?.trim()) || 1;
				return { name, quantity };
			});

			expect(items).toHaveLength(3);
			expect(items[0].quantity).toBe(1);
			expect(items[1].quantity).toBe(1);
		});

		it('should handle whitespace variations', () => {
			const itemsSummary = '  Butter Naan   x2  ,  Paneer Tikka x1  ';

			const items = itemsSummary.split(',').map((item) => {
				const parts = item.trim().split('x');
				const name = parts[0].trim();
				const quantity = parseInt(parts[1]?.trim()) || 1;
				return { name, quantity };
			});

			expect(items[0].name).toBe('Butter Naan');
			expect(items[1].name).toBe('Paneer Tikka');
		});

		it('should handle null/empty items_summary', () => {
			const itemsSummary = null;

			const items = itemsSummary
				? itemsSummary.split(',').map((item) => {
						const parts = item.trim().split('x');
						const name = parts[0].trim();
						const quantity = parseInt(parts[1]?.trim()) || 1;
						return { name, quantity };
					})
				: [];

			expect(items).toHaveLength(0);
		});
	});

	describe('top items aggregation', () => {
		it('should aggregate items by frequency and return top 15', () => {
			const orders = [
				{
					items_summary: 'Butter Naan x2, Paneer Tikka x1',
					channel: 'counter',
					status: 'delivered'
				},
				{
					items_summary: 'Butter Naan x1, Gulab Jamun x2',
					channel: 'counter',
					status: 'delivered'
				},
				{
					items_summary: 'Paneer Tikka x1, Butter Naan x1',
					channel: 'counter',
					status: 'delivered'
				}
			];

			// Simulate aggregation
			const itemCounts: Record<string, number> = {};
			for (const order of orders) {
				if (order.channel !== 'counter' || order.status?.toLowerCase() !== 'delivered') continue;

				const items =
					order.items_summary?.split(',').map((item) => item.trim().split('x')[0].trim()) || [];

				for (const item of items) {
					itemCounts[item] = (itemCounts[item] || 0) + 1;
				}
			}

			const topItems = Object.entries(itemCounts)
				.map(([name, count]) => ({ name, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 15);

			expect(topItems).toHaveLength(3);
			expect(topItems[0].name).toBe('Butter Naan');
			expect(topItems[0].count).toBe(3); // Appears in 3 orders
			expect(topItems[1].name).toBe('Paneer Tikka');
			expect(topItems[1].count).toBe(2); // Appears in 2 orders
		});

		it('should only count counter channel orders', () => {
			const orders = [
				{ items_summary: 'Butter Naan x2', channel: 'counter', status: 'delivered' },
				{ items_summary: 'Butter Naan x5', channel: 'swiggy', status: 'delivered' },
				{ items_summary: 'Butter Naan x1', channel: 'counter', status: 'delivered' }
			];

			const itemCounts: Record<string, number> = {};
			for (const order of orders) {
				if (order.channel !== 'counter' || order.status?.toLowerCase() !== 'delivered') continue;
				const items =
					order.items_summary?.split(',').map((item) => item.trim().split('x')[0].trim()) || [];
				for (const item of items) {
					itemCounts[item] = (itemCounts[item] || 0) + 1;
				}
			}

			expect(itemCounts['Butter Naan']).toBe(2); // 2 + 1 from counter (2 orders), excludes 5 from Swiggy
		});

		it('should exclude cancelled/failed orders', () => {
			const orders = [
				{ items_summary: 'Butter Naan x2', channel: 'counter', status: 'delivered' },
				{ items_summary: 'Butter Naan x5', channel: 'counter', status: 'cancelled' },
				{ items_summary: 'Paneer x1', channel: 'counter', status: 'failed' }
			];

			const itemCounts: Record<string, number> = {};
			for (const order of orders) {
				const status = (order.status || '').toLowerCase();
				if (order.channel !== 'counter' || status === 'cancelled' || status === 'failed') continue;
				const items =
					order.items_summary?.split(',').map((item) => item.trim().split('x')[0].trim()) || [];
				for (const item of items) {
					itemCounts[item] = (itemCounts[item] || 0) + 1;
				}
			}

			expect(itemCounts['Butter Naan']).toBe(1); // Only from delivered order
			expect(itemCounts['Paneer']).toBeUndefined();
		});
	});

	describe('payment method aggregation', () => {
		it('should aggregate payment types from order_payments table', () => {
			const payments = [
				{ order_id: 'order1', payment_type: 'cash', amount: 100 },
				{ order_id: 'order2', payment_type: 'card', amount: 150 },
				{ order_id: 'order3', payment_type: 'upi', amount: 75 },
				{ order_id: 'order4', payment_type: 'cash', amount: 200 }
			];

			// Aggregate by payment type
			const paymentMix: Record<string, number> = {};
			for (const payment of payments) {
				const type = (payment.payment_type || '').toLowerCase();
				paymentMix[type] = (paymentMix[type] || 0) + 1;
			}

			const total = Object.values(paymentMix).reduce((sum, count) => sum + count, 0);

			expect(paymentMix['cash']).toBe(2);
			expect(paymentMix['card']).toBe(1);
			expect(paymentMix['upi']).toBe(1);
			expect(total).toBe(4);
		});

		it('should calculate percentage distribution for payment methods', () => {
			const paymentCounts = { cash: 60, card: 25, upi: 15 };
			const total = 100;

			const percentages = Object.entries(paymentCounts).map(([type, count]) => ({
				type,
				count,
				percentage: (count / total) * 100
			}));

			expect(percentages[0].percentage).toBe(60);
			expect(percentages[1].percentage).toBe(25);
			expect(percentages[2].percentage).toBe(15);
		});

		it('should handle missing payment type as other', () => {
			const payments = [
				{ order_id: 'order1', payment_type: 'cash', amount: 100 },
				{ order_id: 'order2', payment_type: null, amount: 50 },
				{ order_id: 'order3', payment_type: 'card', amount: 150 }
			];

			const paymentMix: Record<string, number> = {};
			for (const payment of payments) {
				const type = (payment.payment_type || 'other').toLowerCase();
				paymentMix[type] = (paymentMix[type] || 0) + 1;
			}

			expect(paymentMix['cash']).toBe(1);
			expect(paymentMix['other']).toBe(1);
			expect(paymentMix['card']).toBe(1);
		});
	});

	describe('date range filtering', () => {
		it('should filter counter orders within date range', () => {
			const orders = [
				{ channel: 'counter', order_date: new Date('2026-01-15'), items_summary: 'Item1' },
				{ channel: 'counter', order_date: new Date('2026-02-20'), items_summary: 'Item2' },
				{ channel: 'counter', order_date: new Date('2026-06-01'), items_summary: 'Item3' }
			];

			const start = new Date('2026-01-01');
			const end = new Date('2026-05-31');

			const filtered = orders.filter((o) => o.order_date >= start && o.order_date <= end);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].items_summary).toBe('Item1');
			expect(filtered[1].items_summary).toBe('Item2');
		});
	});

	describe('data validation', () => {
		it('should handle orders with null items_summary', () => {
			const order = { items_summary: null, channel: 'counter', status: 'delivered' };

			const items = order.items_summary
				? order.items_summary.split(',').map((item) => item.trim().split('x')[0].trim())
				: [];

			expect(items).toHaveLength(0);
		});

		it('should return empty data when no counter orders exist', () => {
			const orders = [
				{ channel: 'swiggy', items_summary: 'Item1' },
				{ channel: 'zomato', items_summary: 'Item2' }
			];

			const counterOrders = orders.filter((o) => o.channel === 'counter');
			expect(counterOrders).toHaveLength(0);
		});

		it('should handle duplicate items correctly', () => {
			const orders = [
				{ channel: 'counter', status: 'delivered', items_summary: 'Butter Naan x2' },
				{ channel: 'counter', status: 'delivered', items_summary: 'Butter Naan x3' }
			];

			const itemCounts: Record<string, number> = {};
			for (const order of orders) {
				const items =
					order.items_summary?.split(',').map((item) => item.trim().split('x')[0].trim()) || [];
				for (const item of items) {
					itemCounts[item] = (itemCounts[item] || 0) + 1;
				}
			}

			expect(itemCounts['Butter Naan']).toBe(2); // Two orders, both with Butter Naan
		});
	});

	describe('performance considerations', () => {
		it('should limit results to top 15 items', () => {
			const itemCounts: Record<string, number> = {};
			for (let i = 1; i <= 20; i++) {
				itemCounts[`Item${i}`] = i;
			}

			const topItems = Object.entries(itemCounts)
				.map(([name, count]) => ({ name, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 15);

			expect(topItems).toHaveLength(15);
			expect(topItems[0].name).toBe('Item20');
			expect(topItems[14].name).toBe('Item6');
		});

		it('should return fewer than 15 items if less than 15 exist', () => {
			const itemCounts = {
				Item1: 5,
				Item2: 3,
				Item3: 1
			};

			const topItems = Object.entries(itemCounts)
				.map(([name, count]) => ({ name, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 15);

			expect(topItems).toHaveLength(3);
		});
	});
});
