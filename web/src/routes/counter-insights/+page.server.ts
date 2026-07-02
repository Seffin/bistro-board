import { db } from '$lib/server/db';
import { orders, order_payments } from '$lib/server/db/schema';
import { and, between, inArray, ilike, or } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';
import { getAllChannels } from '$lib/server/config';

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

export interface ChannelSummary {
	channel: string;
	color: string;
	orders: number;
	revenue: number;
	aov: number;
}

export interface ChannelDailyTrend {
	date: string;
	[channel: string]: string | number; // date is string, rest are numbers
}

export interface ChannelInsightsData {
	top_items: TopItem[];
	payment_mix: PaymentMethod[];
	total_orders: number;
	total_revenue: number;
	avg_order_value: number;
	daily_trends: DailyTrend[];
	channel_summaries: ChannelSummary[];
	channel_daily_trends: ChannelDailyTrend[];
	selected_channels: string[];
	available_channels: { id: string; name: string; color: string }[];
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ insights: ChannelInsightsData }> => {
	const { start, end } = parseDateRange(url);
	const allChannels = await getAllChannels();

	// Parse multi-channel param (comma-separated) or default to all
	const channelsParam = url.searchParams.get('channels');
	let selectedChannelNames: string[];
	if (channelsParam) {
		const ids = channelsParam.split(',').map((s) => s.trim());
		selectedChannelNames = ids
			.map((id) => {
				const ch = allChannels.find((c) => c.id === id);
				return ch ? ch.name : null;
			})
			.filter(Boolean) as string[];
	} else {
		// Default: all channels
		selectedChannelNames = allChannels.map((c) => c.name);
	}

	if (selectedChannelNames.length === 0) {
		selectedChannelNames = allChannels.map((c) => c.name);
	}

	// Build conditions
	const channelConditions = selectedChannelNames.map((name) => ilike(orders.channel, name));
	const conditions = [or(...channelConditions)!];
	if (start && end) {
		conditions.push(
			between(
				orders.order_date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	// Fetch orders for selected channels
	const matchedOrders = await db.select().from(orders).where(and(...conditions));

	// Filter out cancelled/failed
	const validOrders = matchedOrders.filter((order) => {
		const status = (order.status || '').toLowerCase();
		return status !== 'cancelled' && status !== 'failed';
	});

	// Per-channel aggregation
	const channelMap: Record<string, { orders: number; revenue: number; color: string }> = {};
	for (const chName of selectedChannelNames) {
		const ch = allChannels.find((c) => c.name.toLowerCase() === chName.toLowerCase());
		channelMap[chName.toLowerCase()] = { orders: 0, revenue: 0, color: ch?.color || '#6b7280' };
	}

	// Aggregation vars
	let totalRevenue = 0;
	const dailyMap: Record<string, { orders: number; revenue: number }> = {};
	const channelDailyMap: Record<string, Record<string, number>> = {};
	const itemCounts: Record<string, number> = {};

	for (const order of validOrders) {
		const gross = order.grand_total || 0;
		totalRevenue += gross;
		const cKey = (order.channel || '').toLowerCase();

		// Channel aggregation
		if (channelMap[cKey]) {
			channelMap[cKey].orders++;
			channelMap[cKey].revenue += gross;
		}

		// Daily trend aggregation (combined)
		if (order.order_date) {
			const d = new Date(order.order_date);
			const dateKey = d.toISOString().split('T')[0];
			if (!dailyMap[dateKey]) {
				dailyMap[dateKey] = { orders: 0, revenue: 0 };
			}
			dailyMap[dateKey].orders++;
			dailyMap[dateKey].revenue += gross;

			// Per-channel daily trend
			if (!channelDailyMap[dateKey]) {
				channelDailyMap[dateKey] = {};
			}
			channelDailyMap[dateKey][cKey] = (channelDailyMap[dateKey][cKey] || 0) + gross;
		}

		// Items parsing
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

	// Top 15 items
	const topItems: TopItem[] = Object.entries(itemCounts)
		.map(([name, count]) => ({ name, count, percentage: 0 }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 15);

	const totalItems = topItems.reduce((sum, item) => sum + item.count, 0);
	for (const item of topItems) {
		item.percentage = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
	}

	// Payment methods
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

	const paymentCounts: Record<string, number> = {};
	for (const payment of paymentData) {
		const type = (payment.payment_type || 'other').toLowerCase();
		paymentCounts[type] = (paymentCounts[type] || 0) + 1;
	}

	const paymentMix: PaymentMethod[] = Object.entries(paymentCounts)
		.map(([type, count]) => ({ type, count, percentage: 0 }))
		.sort((a, b) => b.count - a.count);

	const totalPayments = paymentMix.reduce((sum, p) => sum + p.count, 0);
	for (const payment of paymentMix) {
		payment.percentage = totalPayments > 0 ? (payment.count / totalPayments) * 100 : 0;
	}

	// Daily trends (combined)
	const dailyTrends: DailyTrend[] = Object.entries(dailyMap)
		.map(([date, data]) => ({ date, ...data }))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Channel summaries
	const channelSummaries: ChannelSummary[] = Object.entries(channelMap)
		.map(([channel, data]) => ({
			channel: channel.charAt(0).toUpperCase() + channel.slice(1),
			color: data.color,
			orders: data.orders,
			revenue: data.revenue,
			aov: data.orders > 0 ? data.revenue / data.orders : 0
		}))
		.sort((a, b) => b.revenue - a.revenue);

	// Per-channel daily trends for multi-line chart
	const allDates = Object.keys(channelDailyMap).sort();
	const channelDailyTrends: ChannelDailyTrend[] = allDates.map((date) => {
		const entry: ChannelDailyTrend = { date };
		for (const chName of selectedChannelNames) {
			entry[chName.toLowerCase()] = channelDailyMap[date]?.[chName.toLowerCase()] || 0;
		}
		return entry;
	});

	const avgOrderValue = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

	return {
		insights: {
			top_items: topItems,
			payment_mix: paymentMix,
			total_orders: validOrders.length,
			total_revenue: totalRevenue,
			avg_order_value: avgOrderValue,
			daily_trends: dailyTrends,
			channel_summaries: channelSummaries,
			channel_daily_trends: channelDailyTrends,
			selected_channels: selectedChannelNames.map((n) => n.toLowerCase()),
			available_channels: allChannels.map((c) => ({ id: c.id, name: c.name, color: c.color })),
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
