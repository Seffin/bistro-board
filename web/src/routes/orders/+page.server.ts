import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { and, between, ilike, or, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import logger from '$lib/server/logger';
import { parseDateRange } from '$lib/utils/date-filter';

export interface OrderRecord {
	order_id: string;
	order_date: Date;
	channel: string;
	status: string;
	grand_total: number;
	customer_name?: string;
}

export interface OrdersData {
	orders: OrderRecord[];
	pagination: {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		totalOrders: number;
	};
	filters: {
		channels: string[];
		statuses: string[];
		search?: string;
		dateRange?: { start: string; end: string };
	};
}

export const load = async ({
	url
}: {
	url: URL;
}): Promise<{ data: OrdersData }> => {
  try {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const pageSize = 50;

	const channels = url.searchParams.get('channels')?.split(',').filter(Boolean) || [];
	const statuses = url.searchParams.get('statuses')?.split(',').filter(Boolean) || [];
	const search = url.searchParams.get('search') || '';
	const { start, end } = parseDateRange(url);

	// Build filter conditions
	const filterConditions = [];

	if (channels.length > 0) {
		filterConditions.push(or(...channels.map((ch) => ilike(orders.channel, ch))));
	}

	if (statuses.length > 0) {
		filterConditions.push(or(...statuses.map((st) => ilike(orders.status, st))));
	}

	if (search) {
		filterConditions.push(ilike(orders.order_id, `%${search}%`));
	}

	if (start && end) {
		filterConditions.push(
			between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
		);
	}

	// Get total count
	let countQuery = db.select().from(orders);
	if (filterConditions.length > 0) {
		countQuery = countQuery.where(and(...filterConditions));
	}

	const allFilteredOrders = await countQuery;
	const totalOrders = allFilteredOrders.length;
	const totalPages = Math.ceil(totalOrders / pageSize);

	// Get paginated results
	let query = db
		.select()
		.from(orders)
		.orderBy(desc(orders.order_date))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	if (filterConditions.length > 0) {
		query = query.where(and(...filterConditions));
	}

	const queryResults = await query;

	const ordersList: OrderRecord[] = queryResults.map((o) => ({
		order_id: o.order_id,
		order_date: new Date(o.order_date),
		channel: o.channel || 'unknown',
		status: o.status || 'unknown',
		grand_total: parseFloat(o.grand_total?.toString() || '0'),
		customer_name: o.customer_name
	}));

	return {
		data: {
			orders: ordersList,
			pagination: {
				currentPage: page,
				totalPages: Math.max(1, totalPages),
				pageSize,
				totalOrders
			},
			filters: {
				channels,
				statuses,
				search: search || undefined,
				dateRange:
					start && end
						? {
								start,
								end
							}
						: undefined
			}
		}
	};
  } catch (err) {
	logger.error({ err, path: '/orders' }, 'Failed to load orders');
	throw error(500, 'Failed to load orders. Please try again later.');
  }
};
