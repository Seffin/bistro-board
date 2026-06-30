import { db } from '$lib/server/db';
import { orders, order_payments } from '$lib/server/db/schema';
import { and, between, inArray, ilike } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

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

export interface DailyTrend {
	date: string;
	orders: number;
	revenue: number;
}

export interface CounterInsightsData {
	top_items: TopItem[];
	payment_mix: PaymentMethod[];
	total_orders: number;
	total_revenue: number;
	avg_order_value: number;
	daily_trends: DailyTrend[];
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ insights: CounterInsightsData }> => {
	const { start, end } = parseDateRange(url);

	// Build conditions — use ilike for case-insensitive channel matching
	const conditions = [ilike(orders.channel, 'counter')];
	if (start && end) {
		conditions.push(
			between(
				orders.order_date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	// Fetch counter channel orders with case-insensitive matching
	const counterOrders = await db
		.select()
		.from(orders)
		.where(and(...conditions));

	// Filter out cancelled/failed orders and parse items_summary
	const validOrders = counterOrders.filter((order) => {
		const status = (order.status || '').toLowerCase();
		return status !== 'cancelled' && status !== 'failed';
	});

	// Calculate revenue metrics
	let totalRevenue = 0;
	const dailyMap: Record<string, { orders: number; revenue: number }> = {};

	// Aggregate items by frequency
	const itemCounts: Record<string, number> = {};
	for (const order of validOrders) {
		const gross = order.grand_total || 0;
		totalRevenue += gross;

		// Daily trend aggregation
		if (order.order_date) {
			const d = new Date(order.order_date);
			const dateKey = d.toISOString().split('T')[0];
			if (!dailyMap[dateKey]) {
				dailyMap[dateKey] = { orders: 0, revenue: 0 };
			}
			dailyMap[dateKey].orders++;
			dailyMap[dateKey].revenue += gross;
		}

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
	let paymentData: { payment_type: string | null; count: string }[] = [];
	if (validOrders.length > 0) {
		paymentData = await db
			.select({
				payment_type: order_payments.payment_type,
				count: order_payments.payment_id
			})
			.from(order_payments)
			.where(
				inArray(
					order_payments.order_id,
					validOrders.map((o) => o.order_id)
				)
			);
	}

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

	// Build daily trends sorted
	const dailyTrends: DailyTrend[] = Object.entries(dailyMap)
		.map(([date, data]) => ({ date, ...data }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const avgOrderValue = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

	return {
		insights: {
			top_items: topItems,
			payment_mix: paymentMix,
			total_orders: validOrders.length,
			total_revenue: totalRevenue,
			avg_order_value: avgOrderValue,
			daily_trends: dailyTrends,
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
