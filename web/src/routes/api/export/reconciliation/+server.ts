import { db } from '$lib/server/db';
import { orders, income_register } from '$lib/server/db/schema';
import { between } from 'drizzle-orm';
import { toCSV, csvResponse } from '$lib/server/csv';
import type { RequestHandler } from './$types';
import logger from '$lib/server/logger';
import { parseDateRange } from '$lib/utils/date-filter';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { start, end } = parseDateRange(url);

		let counterQuery = db.select().from(orders).where(orders.channel === 'counter');
		if (start && end) {
			counterQuery = counterQuery.where(
				between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
			);
		}

		let ledgerQuery = db.select().from(income_register);
		if (start && end) {
			ledgerQuery = ledgerQuery.where(
				between(
					income_register.date,
					new Date(`${start}T00:00:00Z`),
					new Date(`${end}T23:59:59Z`)
				)
			);
		}

		const counterData = await counterQuery;
		const ledgerData = await ledgerQuery;

		const counterByDate = new Map<string, number>();
		for (const record of counterData) {
			const dateStr = record.order_date instanceof Date ? record.order_date.toISOString().split('T')[0] : record.order_date;
			const current = counterByDate.get(dateStr) || 0;
			counterByDate.set(dateStr, current + parseFloat(record.grand_total?.toString() || '0'));
		}

		const ledgerByDate = new Map<string, number>();
		for (const record of ledgerData) {
			const dateStr = record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date;
			const current = ledgerByDate.get(dateStr) || 0;
			ledgerByDate.set(dateStr, current + parseFloat(record.amount?.toString() || '0'));
		}

		const allDates = new Set([...counterByDate.keys(), ...ledgerByDate.keys()]);
		const rows = [];

		for (const dateStr of Array.from(allDates).sort().reverse()) {
			const counterTotal = counterByDate.get(dateStr) || 0;
			const ledgerTotal = ledgerByDate.get(dateStr) || 0;
			const variance = counterTotal - ledgerTotal;
			const status = Math.abs(variance) < 1 ? 'Matched' : 'Mismatch';

			rows.push({
				Date: dateStr,
				'Counter POS Total': counterTotal,
				'Ledger Total': ledgerTotal,
				Variance: variance,
				Status: status
			});
		}

		const headers = ['Date', 'Counter POS Total', 'Ledger Total', 'Variance', 'Status'];

		const csvStr = toCSV(headers, rows);
		const filename = `reconciliation_export_${new Date().toISOString().split('T')[0]}.csv`;

		return csvResponse(csvStr, filename);
	} catch (err) {
		logger.error({ err, path: '/api/export/reconciliation' }, 'Failed to export reconciliation CSV');
		return new Response('Failed to generate CSV', { status: 500 });
	}
};
