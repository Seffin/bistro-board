import { db } from '$lib/server/db';
import { income_register } from '$lib/server/db/schema';
import { between } from 'drizzle-orm';

export interface DailyIncomeBreakdown {
	date: string;
	counter: number;
	swiggy: number;
	zomato: number;
	other: number;
	total: number;
}

export interface LedgerData {
	daily_breakdown: DailyIncomeBreakdown[];
	summary: {
		total_income: number;
		net_profit: number;
		profit_margin: number;
		days: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

export const load = async ({ url }: { url: URL }): Promise<{ ledger: LedgerData }> => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	// Fetch income records with optional date filtering
	let query = db.select().from(income_register);

	if (start && end) {
		query = query.where(
			between(
				income_register.date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	const records = await query;

	// Group by date
	const byDate = new Map<string, typeof records>();
	for (const record of records) {
		const dateStr = record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date;
		if (!byDate.has(dateStr)) {
			byDate.set(dateStr, []);
		}
		byDate.get(dateStr)!.push(record);
	}

	// Calculate daily breakdown
	const dailyBreakdown: DailyIncomeBreakdown[] = [];
	let totalIncome = 0;

	for (const [dateStr, dayRecords] of byDate) {
		const breakdown: DailyIncomeBreakdown = {
			date: dateStr,
			counter: 0,
			swiggy: 0,
			zomato: 0,
			other: 0,
			total: 0
		};

		for (const record of dayRecords) {
			const amount = parseFloat(record.amount?.toString() || '0');
			const channel = (record.channel || 'other').toLowerCase();

			if (channel === 'counter') breakdown.counter += amount;
			else if (channel === 'swiggy') breakdown.swiggy += amount;
			else if (channel === 'zomato') breakdown.zomato += amount;
			else breakdown.other += amount;

			breakdown.total += amount;
		}

		totalIncome += breakdown.total;
		dailyBreakdown.push(breakdown);
	}

	// Sort by date descending
	dailyBreakdown.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// Calculate profit (simplified - actual expenses would come from expense table)
	const netProfit = totalIncome; // Placeholder
	const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

	return {
		ledger: {
			daily_breakdown: dailyBreakdown,
			summary: {
				total_income: totalIncome,
				net_profit: netProfit,
				profit_margin: profitMargin,
				days: dailyBreakdown.length
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
