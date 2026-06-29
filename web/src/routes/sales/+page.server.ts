import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { desc, between } from 'drizzle-orm';

export const load = async ({ url }: { url: URL }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	// Fetch the 50 most recent orders for the UI
	const recentOrders = start && end
		? await db.select()
				.from(orders)
				.where(between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`)))
				.orderBy(desc(orders.order_date))
				.limit(50)
		: await db.select()
				.from(orders)
				.orderBy(desc(orders.order_date))
				.limit(50);

	return {
		orders: recentOrders,
		dateRange: { start: start || '', end: end || '' }
	};
};
