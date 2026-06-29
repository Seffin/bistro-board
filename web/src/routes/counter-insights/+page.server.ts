import { db } from '$lib/server/db';
import { orders, order_payments } from '$lib/server/db/schema';
import { eq, and, between } from 'drizzle-orm';

export interface TopItem {
	name: string;
	count: number;
	percentage: number;
}

export interface PaymentMethod {
	type: string;
	count: number;
	percentage: number;
}

export interface CounterInsightsData {
	top_items: TopItem[];
	payment_mix: PaymentMethod[];
	total_orders: number;
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ insights: CounterInsightsData }> => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	// Fetch counter channel orders with optional date filtering
	const counterOrders =
		start && end
			? await db
					.select()
					.from(orders)
					.where(
						and(
							eq(orders.channel, 'counter'),
							between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
						)
					)
			: await db.select().from(orders).where(eq(orders.channel, 'counter'));

	// Filter out cancelled/failed orders and parse items_summary
	const validOrders = counterOrders.filter((order) => {
		const status = (order.status || '').toLowerCase();
		return status !== 'cancelled' && status !== 'failed';
	});

	// Aggregate items by frequency
	const itemCounts: Record<string, number> = {};
	for (const order of validOrders) {
		if (!order.items_summary) continue;

		const items = order.items_summary
			.split(',')
			.map((item) => {
				const parts = item.trim().split('x');
				return parts[0].trim();
			})
			.filter((item) => item.length > 0);

		for (const item of items) {
			itemCounts[item] = (itemCounts[item] || 0) + 1;
		}
	}

	// Get top 15 items
	const topItems: TopItem[] = Object.entries(itemCounts)
		.map(([name, count]) => ({
			name,
			count,
			percentage: 0 // Will calculate after sorting
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 15);

	// Calculate percentages
	const totalItems = topItems.reduce((sum, item) => sum + item.count, 0);
	for (const item of topItems) {
		item.percentage = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
	}

	// Fetch payment methods for counter orders
	const paymentData = await db
		.select({
			payment_type: order_payments.payment_type,
			count: order_payments.payment_id
		})
		.from(order_payments)
		.where(order_payments.order_id.inArray(validOrders.map((o) => o.order_id)));

	// Aggregate payment methods
	const paymentCounts: Record<string, number> = {};
	for (const payment of paymentData) {
		const type = (payment.payment_type || 'other').toLowerCase();
		paymentCounts[type] = (paymentCounts[type] || 0) + 1;
	}

	// Convert to array with percentages
	const paymentMix: PaymentMethod[] = Object.entries(paymentCounts)
		.map(([type, count]) => ({
			type,
			count,
			percentage: 0
		}))
		.sort((a, b) => b.count - a.count);

	// Calculate percentages
	const totalPayments = paymentMix.reduce((sum, p) => sum + p.count, 0);
	for (const payment of paymentMix) {
		payment.percentage = totalPayments > 0 ? (payment.count / totalPayments) * 100 : 0;
	}

	return {
		insights: {
			top_items: topItems,
			payment_mix: paymentMix,
			total_orders: validOrders.length,
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
