import { db } from '$lib/server/db';
import { orders, income_register } from '$lib/server/db/schema';
import { between, and, ilike, gte, lte } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface DailyReconciliation {
	date: string;
	pos_gross: number;
	pos_net: number;
	ledger_amount: number;
	variance: number;
	status: 'matched' | 'mismatched';
}

export interface ReconciliationData {
	daily_data: DailyReconciliation[];
	summary: {
		total_pos: number;
		total_ledger: number;
		total_variance: number;
		matched: number;
		mismatched: number;
		reconciliation_rate: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ reconciliation: ReconciliationData }> => {
	const { start, end } = parseDateRange(url);

	// Fetch orders for Counter channel
	// FIX: Use Drizzle's ilike instead of JS ===
	const orderConditions = [ilike(orders.channel, 'counter')];
	if (start && end) {
		orderConditions.push(
			between(
				orders.order_date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	const allOrders = await db
		.select({
			order_date: orders.order_date,
			grand_total: orders.grand_total,
			net_payout: orders.net_payout,
			status: orders.status
		})
		.from(orders)
		.where(and(...orderConditions));

	// Group POS data by date
	const posByDate: Record<string, { gross: number; net: number }> = {};
	for (const order of allOrders) {
		const status = (order.status || '').toLowerCase();
		if (status === 'cancelled' || status === 'failed') continue;

		if (order.order_date) {
			const dateObj = new Date(order.order_date);
			const dateStr = dateObj.toISOString().split('T')[0];
			if (!posByDate[dateStr]) {
				posByDate[dateStr] = { gross: 0, net: 0 };
			}
			posByDate[dateStr].gross += order.grand_total || 0;
			posByDate[dateStr].net += order.net_payout || 0;
		}
	}

	// Fetch Ledger data for Counter
	// FIX: income_register uses text dates, so use gte/lte instead of between with Date objects
	let ledgerQuery = db.select({
		date: income_register.date,
		petpooja_net: income_register.petpooja_net
	}).from(income_register);

	if (start && end) {
		ledgerQuery = ledgerQuery.where(
			and(
				gte(income_register.date, start),
				lte(income_register.date, end)
			)
		) as any;
	}

	const ledgerRecords = await ledgerQuery;

	const ledgerByDate: Record<string, number> = {};
	for (const record of ledgerRecords) {
		if (record.date) {
			// petpooja_net is the actual column mapping for Counter income
			ledgerByDate[record.date] = record.petpooja_net || 0;
		}
	}

	// Reconcile POS vs Ledger
	const allDates = new Set([...Object.keys(posByDate), ...Object.keys(ledgerByDate)]);
	const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a)); // Descending

	const dailyData: DailyReconciliation[] = [];
	let totalPos = 0;
	let totalLedger = 0;
	let matched = 0;
	let mismatched = 0;

	for (const date of sortedDates) {
		const posGross = posByDate[date]?.gross || 0;
		const posNet = posByDate[date]?.net || 0;
		const ledgerAmount = ledgerByDate[date] || 0;

		// Reconcile based on net payout (what should actually hit the bank/ledger)
		const variance = posNet - ledgerAmount;
		const status = Math.abs(variance) < 1 ? 'matched' : 'mismatched'; // Tolerance of 1 Rupee

		totalPos += posNet;
		totalLedger += ledgerAmount;

		if (status === 'matched') {
			matched++;
		} else {
			mismatched++;
		}

		dailyData.push({
			date,
			pos_gross: posGross,
			pos_net: posNet,
			ledger_amount: ledgerAmount,
			variance,
			status
		});
	}

	const totalVariance = totalPos - totalLedger;
	const reconciliationRate = allDates.size > 0 ? (matched / allDates.size) * 100 : 0;

	return {
		reconciliation: {
			daily_data: dailyData,
			summary: {
				total_pos: totalPos,
				total_ledger: totalLedger,
				total_variance: totalVariance,
				matched,
				mismatched,
				reconciliation_rate: reconciliationRate
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
