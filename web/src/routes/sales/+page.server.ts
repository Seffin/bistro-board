import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { eq, desc, between, and } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';
import { getAllChannels } from '$lib/server/config';

export const load = async ({ url }: { url: URL }) => {
	const { start, end } = parseDateRange(url);
	const channelId = url.searchParams.get('channel');
	const activeChannels = await getAllChannels();

	let channelName: string | undefined;
	if (channelId && channelId !== 'all') {
		const found = activeChannels.find((c) => c.id === channelId);
		if (found) {
			channelName = found.name;
		}
	}

	const conditions = [];
	if (start && end) {
		conditions.push(between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`)));
	}
	if (channelName) {
		conditions.push(eq(orders.channel, channelName));
	}

	// Fetch the 50 most recent orders for the UI
	let query = db.select().from(orders).$dynamic();
	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}
	
	const recentOrders = await query.orderBy(desc(orders.order_date)).limit(50);

	return {
		orders: recentOrders,
		dateRange: { start: start || '', end: end || '' }
	};
};
