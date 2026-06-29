import { db } from '$lib/server/db';
import { orders, income_register } from '$lib/server/db/schema';
import { between } from 'drizzle-orm';

export interface ReconciliationRecord {
	date: string;
	counter_total: number;
	ledger_total: number;
	variance: number;
	variance_percent: number;
	status: string;
}

export interface ReconciliationData {
	daily_records: ReconciliationRecord[];
	summary: {
		matched: number;
		mismatched: number;
		total: number;
		reconciliation_rate: number;
		total_variance: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ reconciliation: ReconciliationData }> => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	// Fetch counter orders
	let counterQuery = db.select().from(orders).where(orders.channel === 'counter');
	if (start && end) {
		counterQuery = counterQuery.where(
			between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
		);
	}

	// Fetch ledger income
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

	// Group counter data by date
	const counterByDate = new Map<string, number>();
	for (const record of counterData) {
		const dateStr = record.order_date instanceof Date ? record.order_date.toISOString().split('T')[0] : record.order_date;
		const current = counterByDate.get(dateStr) || 0;
		counterByDate.set(dateStr, current + parseFloat(record.grand_total?.toString() || '0'));
	}

	// Group ledger data by date
	const ledgerByDate = new Map<string, number>();
	for (const record of ledgerData) {
		const dateStr = record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date;
		const current = ledgerByDate.get(dateStr) || 0;
		ledgerByDate.set(dateStr, current + parseFloat(record.amount?.toString() || '0'));
	}

	// Reconcile by date
	const allDates = new Set([...counterByDate.keys(), ...ledgerByDate.keys()]);
	const dailyRecords: ReconciliationRecord[] = [];
	let matched = 0;
	let mismatched = 0;
	let totalVariance = 0;

	for (const dateStr of Array.from(allDates).sort().reverse()) {
		const counterTotal = counterByDate.get(dateStr) || 0;
		const ledgerTotal = ledgerByDate.get(dateStr) || 0;
		const variance = counterTotal - ledgerTotal;
		const variancePercent = counterTotal > 0 ? (variance / counterTotal) * 100 : 0;
		const status = Math.abs(variance) < 1 ? 'matched' : 'mismatch';

		if (status === 'matched') {
			matched++;
		} else {
			mismatched++;
		}

		totalVariance += Math.abs(variance);

		dailyRecords.push({
			date: dateStr,
			counter_total: counterTotal,
			ledger_total: ledgerTotal,
			variance,
			variance_percent: variancePercent,
			status
		});
	}

	const total = matched + mismatched;
	const reconciliationRate = total > 0 ? (matched / total) * 100 : 0;

	return {
		reconciliation: {
			daily_records: dailyRecords,
			summary: {
				matched,
				mismatched,
				total,
				reconciliation_rate: reconciliationRate,
				total_variance: totalVariance
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
