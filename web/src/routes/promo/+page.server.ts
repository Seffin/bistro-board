import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { and, between, notInArray } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface DiscountBucket {
	bucket_range: string;
	order_count: number;
	total_amount: number;
	total_discount_value: number;
	avg_discount: number;
	penetration_rate: number;
}

export interface ChannelPromo {
	channel: string;
	orders_with_promo: number;
	total_orders: number;
	penetration_rate: number;
	total_discount: number;
}

export interface PromoData {
	discount_buckets: DiscountBucket[];
	channel_breakdown: ChannelPromo[];
	summary: {
		total_orders: number;
		total_orders_with_promo: number;
		penetration_rate: number;
		total_discount_value: number;
		avg_discount: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ promo: PromoData }> => {
	const { start, end } = parseDateRange(url);

	const conditions = [notInArray(orders.status, ['cancelled', 'failed'])];
	if (start && end) {
		conditions.push(
			between(
				orders.order_date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	const allOrders = await db
		.select({
			grand_total: orders.grand_total,
			discount: orders.discount, // Fix: Use 'discount' instead of 'other_charges'
			channel: orders.channel
		})
		.from(orders)
		.where(and(...conditions));

	const totalOrders = allOrders.length;
	let ordersWithPromo = 0;
	let totalDiscountValue = 0;

	// Bins for discount ranges
	const bins = [
		{ min: 1, max: 50, label: '₹1 - ₹50', count: 0, amount: 0, discount_value: 0 },
		{ min: 51, max: 100, label: '₹51 - ₹100', count: 0, amount: 0, discount_value: 0 },
		{ min: 101, max: 200, label: '₹101 - ₹200', count: 0, amount: 0, discount_value: 0 },
		{ min: 201, max: 500, label: '₹201 - ₹500', count: 0, amount: 0, discount_value: 0 },
		{ min: 501, max: 999999, label: '₹500+', count: 0, amount: 0, discount_value: 0 }
	];

	// Channel breakdown
	const channelMap: Record<string, { total: number; promo: number; discount: number }> = {};

	for (const order of allOrders) {
		const discount = order.discount || 0;
		const channel = (order.channel || 'unknown').toLowerCase();

		if (!channelMap[channel]) {
			channelMap[channel] = { total: 0, promo: 0, discount: 0 };
		}
		channelMap[channel].total++;

		if (discount > 0) {
			ordersWithPromo++;
			totalDiscountValue += discount;
			channelMap[channel].promo++;
			channelMap[channel].discount += discount;

			const amount = order.grand_total || 0;

			// Categorize into bins
			for (const bin of bins) {
				if (discount >= bin.min && discount <= bin.max) {
					bin.count++;
					bin.amount += amount;
					bin.discount_value += discount;
					break; // Stop after finding the right bin
				}
			}
		}
	}

	// Format buckets
	const discountBuckets: DiscountBucket[] = bins
		.filter((bin) => bin.count > 0)
		.map((bin) => ({
			bucket_range: bin.label,
			order_count: bin.count,
			total_amount: bin.amount,
			total_discount_value: bin.discount_value,
			avg_discount: bin.discount_value / bin.count,
			penetration_rate: totalOrders > 0 ? (bin.count / totalOrders) * 100 : 0
		}));

	// Format channel breakdown
	const channelBreakdown: ChannelPromo[] = Object.entries(channelMap)
		.filter(([_, data]) => data.total > 0)
		.map(([channel, data]) => ({
			channel: channel.charAt(0).toUpperCase() + channel.slice(1),
			orders_with_promo: data.promo,
			total_orders: data.total,
			penetration_rate: data.total > 0 ? (data.promo / data.total) * 100 : 0,
			total_discount: data.discount
		}))
		.sort((a, b) => b.total_discount - a.total_discount);

	const overallPenetration = totalOrders > 0 ? (ordersWithPromo / totalOrders) * 100 : 0;
	const overallAvgDiscount = ordersWithPromo > 0 ? totalDiscountValue / ordersWithPromo : 0;

	return {
		promo: {
			discount_buckets: discountBuckets,
			channel_breakdown: channelBreakdown,
			summary: {
				total_orders: totalOrders,
				total_orders_with_promo: ordersWithPromo,
				penetration_rate: overallPenetration,
				total_discount_value: totalDiscountValue,
				avg_discount: overallAvgDiscount
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
