import { db } from '$lib/server/db';
import { income_register } from '$lib/server/db/schema';
import { between } from 'drizzle-orm';
import { toCSV, csvResponse } from '$lib/server/csv';
import type { RequestHandler } from './$types';
import logger from '$lib/server/logger';
import { parseDateRange } from '$lib/utils/date-filter';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { start, end } = parseDateRange(url);

		let query = db.select().from(income_register);

		if (start && end) {
			query = query.where(
				between(income_register.date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
			);
		}

		const records = await query;

		const byDate = new Map<string, typeof records>();
		for (const record of records) {
			const dateStr =
				record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date;
			if (!byDate.has(dateStr)) {
				byDate.set(dateStr, []);
			}
			byDate.get(dateStr)!.push(record);
		}

		const rows = [];
		for (const [dateStr, dayRecords] of byDate) {
			const row = {
				Date: dateStr,
				'Counter POS': 0,
				Swiggy: 0,
				Zomato: 0,
				Other: 0,
				Total: 0
			};

			for (const record of dayRecords) {
				const amount = parseFloat(record.amount?.toString() || '0');
				const channel = (record.channel || 'other').toLowerCase();

				if (channel === 'counter') row['Counter POS'] += amount;
				else if (channel === 'swiggy') row.Swiggy += amount;
				else if (channel === 'zomato') row.Zomato += amount;
				else row.Other += amount;

				row.Total += amount;
			}

			rows.push(row);
		}

		rows.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

		const headers = ['Date', 'Counter POS', 'Swiggy', 'Zomato', 'Other', 'Total'];

		const csvStr = toCSV(headers, rows);
		const filename = `ledger_export_${new Date().toISOString().split('T')[0]}.csv`;

		return csvResponse(csvStr, filename);
	} catch (err) {
		logger.error({ err, path: '/api/export/ledger' }, 'Failed to export ledger CSV');
		return new Response('Failed to generate CSV', { status: 500 });
	}
};
