import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { and, between, ilike, eq, notInArray } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface WeeklyPayout {
	week: string;
	start_date: string;
	end_date: string;
	counter: number;
	swiggy: number;
	zomato: number;
	other: number;
	total: number;
}

export interface PayoutData {
	weekly_payouts: WeeklyPayout[];
	summary: {
		total_payout: number;
		average_weekly: number;
		highest_week: string;
		weeks: number;
	};
	date_range: {
		start: string;
		end: string;
	};
}

// Helper to get week string (e.g. "2026-W03")
function getWeekString(dateObj: Date): string {
	const date = new Date(dateObj.getTime());
	date.setHours(0, 0, 0, 0);
	// Thursday in current week decides the year.
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	// January 4 is always in week 1.
	const week1 = new Date(date.getFullYear(), 0, 4);
	// Adjust to Thursday in week 1 and count number of weeks from date to week1.
	const weekNumber =
		1 +
		Math.round(
			((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
		);
	return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

export const load = async ({ url }: { url: URL }): Promise<{ payouts: PayoutData }> => {
	const { start, end } = parseDateRange(url);

	// Build condition array
	const conditions = [notInArray(orders.status, ['cancelled', 'failed'])];
	if (start && end) {
		conditions.push(
			between(
				orders.order_date,
				new Date(`${start}T00:00:00Z`),
				new Date(`${end}T23:59:59Z`)
			)
		);
	}

	// Fetch successful orders
	const query = db
		.select({
			order_date: orders.order_date,
			channel: orders.channel,
			net_payout: orders.net_payout
		})
		.from(orders)
		.where(and(...conditions));

	const allOrders = await query;

	// Group by Week
	const weeklyMap: Record<
		string,
		{ start_date: string; end_date: string; counter: number; swiggy: number; zomato: number; other: number }
	> = {};

	for (const order of allOrders) {
		if (!order.order_date) continue;

		const dateObj = new Date(order.order_date);
		const weekStr = getWeekString(dateObj);

		if (!weeklyMap[weekStr]) {
			// Find Monday and Sunday of this week
			const day = dateObj.getDay();
			const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
			const monday = new Date(dateObj.setDate(diff));
			const sunday = new Date(dateObj.setDate(monday.getDate() + 6));

			weeklyMap[weekStr] = {
				start_date: monday.toISOString().split('T')[0],
				end_date: sunday.toISOString().split('T')[0],
				counter: 0,
				swiggy: 0,
				zomato: 0,
				other: 0
			};
		}

		const payout = order.net_payout || 0;
		const channel = (order.channel || '').toLowerCase();

		if (channel === 'counter') {
			weeklyMap[weekStr].counter += payout;
		} else if (channel === 'swiggy') {
			weeklyMap[weekStr].swiggy += payout;
		} else if (channel === 'zomato') {
			weeklyMap[weekStr].zomato += payout;
		} else {
			weeklyMap[weekStr].other += payout;
		}
	}

	// Convert to array and sort descending by week
	const weeklyPayouts: WeeklyPayout[] = Object.entries(weeklyMap)
		.map(([week, data]) => ({
			week,
			start_date: data.start_date,
			end_date: data.end_date,
			counter: data.counter,
			swiggy: data.swiggy,
			zomato: data.zomato,
			other: data.other,
			total: data.counter + data.swiggy + data.zomato + data.other
		}))
		.sort((a, b) => b.week.localeCompare(a.week));

	// Calculate summary
	let totalPayout = 0;
	let highestTotal = 0;
	let highestWeek = '';

	for (const week of weeklyPayouts) {
		totalPayout += week.total;
		if (week.total > highestTotal) {
			highestTotal = week.total;
			highestWeek = week.week;
		}
	}

	const weeksCount = weeklyPayouts.length;
	const averageWeekly = weeksCount > 0 ? totalPayout / weeksCount : 0;

	return {
		payouts: {
			weekly_payouts: weeklyPayouts,
			summary: {
				total_payout: totalPayout,
				average_weekly: averageWeekly,
				highest_week: highestWeek,
				weeks: weeksCount
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
