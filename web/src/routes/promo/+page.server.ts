import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { between, ne } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface DiscountBucket {
	bucket_range: string;
	order_count: number;
	avg_discount: number;
	total_discount_value: number;
	total_amount: number;
	penetration_rate: number;
}

export interface PromoData {
	discount_buckets: DiscountBucket[];
	summary: {
		total_orders_with_promo: number;
		total_discount_value: number;
		avg_discount: number;
		penetration_rate: number;
		total_orders: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ promo: PromoData }> => {
	const { start, end } = parseDateRange(url);

	// Fetch orders
	let query = db.select().from(orders).where(ne(orders.status, 'cancelled'));

	if (start && end) {
		query = query.where(
			between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
		);
	}

	const orders_data = await query;

	// Initialize buckets
	const buckets: Record<string, DiscountBucket> = {
		'0-100': {
			bucket_range: '₹0-100',
			order_count: 0,
			avg_discount: 0,
			total_discount_value: 0,
			total_amount: 0,
			penetration_rate: 0
		},
		'100-250': {
			bucket_range: '₹100-250',
			order_count: 0,
			avg_discount: 0,
			total_discount_value: 0,
			total_amount: 0,
			penetration_rate: 0
		},
		'250-500': {
			bucket_range: '₹250-500',
			order_count: 0,
			avg_discount: 0,
			total_discount_value: 0,
			total_amount: 0,
			penetration_rate: 0
		},
		'500+': {
			bucket_range: '₹500+',
			order_count: 0,
			avg_discount: 0,
			total_discount_value: 0,
			total_amount: 0,
			penetration_rate: 0
		}
	};

	let totalOrdersWithPromo = 0;
	let totalDiscountValue = 0;
	let totalOrders = orders_data.length;

	// Categorize orders by discount
	for (const order of orders_data) {
		const discount = parseFloat(order.other_charges?.toString() || '0');
		const amount = parseFloat(order.grand_total?.toString() || '0');

		let bucketKey = '0-100';
		if (discount >= 100 && discount < 250) bucketKey = '100-250';
		else if (discount >= 250 && discount < 500) bucketKey = '250-500';
		else if (discount >= 500) bucketKey = '500+';

		const bucket = buckets[bucketKey];

		if (discount > 0) {
			totalOrdersWithPromo++;
			totalDiscountValue += discount;
		}

		bucket.order_count++;
		bucket.total_discount_value += discount;
		bucket.total_amount += amount;
	}

	// Calculate metrics for each bucket
	const bucketArray = Object.values(buckets);
	const avgDiscount = totalOrdersWithPromo > 0 ? totalDiscountValue / totalOrdersWithPromo : 0;
	const penetrationRate = totalOrders > 0 ? (totalOrdersWithPromo / totalOrders) * 100 : 0;

	for (const bucket of bucketArray) {
		if (bucket.order_count > 0) {
			bucket.avg_discount = bucket.total_discount_value / bucket.order_count;
			bucket.penetration_rate = (bucket.order_count / totalOrders) * 100;
		}
	}

	return {
		promo: {
			discount_buckets: bucketArray,
			summary: {
				total_orders_with_promo: totalOrdersWithPromo,
				total_discount_value: totalDiscountValue,
				avg_discount: avgDiscount,
				penetration_rate: penetrationRate,
				total_orders: totalOrders
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
