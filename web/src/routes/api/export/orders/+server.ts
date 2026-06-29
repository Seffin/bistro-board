import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { and, between, ilike, or, desc } from 'drizzle-orm';
import { toCSV, csvResponse } from '$lib/server/csv';
import type { RequestHandler } from './$types';
import logger from '$lib/server/logger';
import { parseDateRange } from '$lib/utils/date-filter';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const channels = url.searchParams.get('channels')?.split(',').filter(Boolean) || [];
		const statuses = url.searchParams.get('statuses')?.split(',').filter(Boolean) || [];
		const search = url.searchParams.get('search') || '';
		const { start, end } = parseDateRange(url);

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

		let query = db.select().from(orders).orderBy(desc(orders.order_date));

		if (filterConditions.length > 0) {
			query = query.where(and(...filterConditions));
		}

		const queryResults = await query;

		const headers = [
			'Order ID',
			'Date',
			'Channel',
			'Status',
			'Subtotal',
			'Discount',
			'Tax',
			'Grand Total',
			'Commission',
			'Net Payout',
			'Customer Name'
		];

		const rows = queryResults.map((o) => ({
			'Order ID': o.order_id,
			Date: o.order_date,
			Channel: o.channel,
			Status: o.status,
			Subtotal: o.subtotal,
			Discount: o.discount,
			Tax: o.tax,
			'Grand Total': o.grand_total,
			Commission: o.commission,
			'Net Payout': o.net_payout,
			'Customer Name': o.customer_name
		}));

		const csvStr = toCSV(headers, rows);
		const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

		return csvResponse(csvStr, filename);
	} catch (err) {
		logger.error({ err, path: '/api/export/orders' }, 'Failed to export orders CSV');
		return new Response('Failed to generate CSV', { status: 500 });
	}
};
