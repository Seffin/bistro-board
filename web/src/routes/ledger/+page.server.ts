import { db } from '$lib/server/db';
import { income_register, expenses } from '$lib/server/db/schema';
import { between, gte, lte, and } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

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
		total_expenses: number;
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
	const { start, end } = parseDateRange(url);

	// Fetch income records with optional date filtering
	// The income_register table stores date as TEXT (e.g., "2026-01-15"),
	// NOT as a timestamp. Use string comparison for filtering.
	const records = await db
		.select()
		.from(income_register)
		.where(
			start && end
				? and(
						gte(income_register.date, start),
						lte(income_register.date, end)
				  )
				: undefined
		);

	// The income_register table has NO 'channel' column.
	// Actual columns are: petpooja_actual, petpooja_net, swiggy_gross, swiggy_payout,
	// zomato_gross, zomato_payout, paper_bill, total_income, fed_bank, yes_bank, cash
	// Map them to channel names:
	//   counter = petpooja_net (POS/Counter net income)
	//   swiggy  = swiggy_payout (Swiggy payout amount)
	//   zomato  = zomato_payout (Zomato payout amount)
	//   total   = total_income (overall daily total)

	const dailyBreakdown: DailyIncomeBreakdown[] = [];
	let totalIncome = 0;

	for (const record of records) {
		const dateStr = record.date || '';
		if (!dateStr) continue;

		const counter = record.petpooja_net || 0;
		const swiggy = record.swiggy_payout || 0;
		const zomato = record.zomato_payout || 0;
		const total = record.total_income || 0;
		// "other" is total minus known channels
		const other = Math.max(0, total - counter - swiggy - zomato);

		dailyBreakdown.push({
			date: dateStr,
			counter,
			swiggy,
			zomato,
			other,
			total
		});

		totalIncome += total;
	}

	// Sort by date descending
	dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date));

	// Fetch expenses for profit calculation
	let totalExpenses = 0;
	if (start && end) {
		const expenseRecords = await db
			.select({ amount: expenses.amount })
			.from(expenses)
			.where(between(expenses.date, start, end));
		for (const exp of expenseRecords) {
			totalExpenses += exp.amount || 0;
		}
	} else {
		const expenseRecords = await db
			.select({ amount: expenses.amount })
			.from(expenses);
		for (const exp of expenseRecords) {
			totalExpenses += exp.amount || 0;
		}
	}

	const netProfit = totalIncome - totalExpenses;
	const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

	return {
		ledger: {
			daily_breakdown: dailyBreakdown,
			summary: {
				total_income: totalIncome,
				total_expenses: totalExpenses,
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
