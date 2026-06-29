import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { between, ne } from 'drizzle-orm';
import { parseDateRange } from '$lib/utils/date-filter';

export interface WeeklyPayout {
	week: string;
	start_date: string;
	end_date: string;
	counter: number;
	swiggy: number;
	zomato: number;
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

export const load = async ({ url }: { url: URL }): Promise<{ payouts: PayoutData }> => {
	const { start, end } = parseDateRange(url);

	// Fetch orders excluding cancelled/failed
	let query = db
		.select()
		.from(orders)
		.where(ne(orders.status, 'cancelled'));

	if (start && end) {
		query = query.where(
			between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
		);
	}

	const orders_data = await query;

	// Group by week
	const weeklyMap = new Map<string, Record<string, number>>();

	for (const order of orders_data) {
		const orderDate = order.order_date instanceof Date ? order.order_date : new Date(order.order_date);
		const dayOfWeek = orderDate.getDay();
		const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

		const monday = new Date(orderDate);
		monday.setDate(orderDate.getDate() - diffToMonday);

		const weekStart = monday.toISOString().split('T')[0];
		const weekEnd = new Date(monday);
		weekEnd.setDate(monday.getDate() + 6);
		const weekEndStr = weekEnd.toISOString().split('T')[0];

		const weekKey = `${weekStart}_${weekEndStr}`;

		if (!weeklyMap.has(weekKey)) {
			weeklyMap.set(weekKey, {
				counter: 0,
				swiggy: 0,
				zomato: 0
			});
		}

		const channel = (order.channel || 'other').toLowerCase();
		const netPayout = parseFloat(order.net_payout?.toString() || order.grand_total?.toString() || '0');

		const week = weeklyMap.get(weekKey)!;
		if (channel === 'counter') week.counter += netPayout;
		else if (channel === 'swiggy') week.swiggy += netPayout;
		else if (channel === 'zomato') week.zomato += netPayout;
	}

	// Convert to array format
	const weeklyPayouts: WeeklyPayout[] = [];
	let totalPayout = 0;
	let highestWeek: WeeklyPayout | null = null;

	for (const [weekKey, channelData] of weeklyMap) {
		const [startDate, endDate] = weekKey.split('_');
		const weekNum = `${startDate.substring(0, 7)}-W${String(Math.ceil(parseInt(startDate.substring(8)) / 7)).padStart(2, '0')}`;

		const total = channelData.counter + channelData.swiggy + channelData.zomato;
		const payout: WeeklyPayout = {
			week: weekNum,
			start_date: startDate,
			end_date: endDate,
			...channelData,
			total
		};

		weeklyPayouts.push(payout);
		totalPayout += total;

		if (!highestWeek || payout.total > highestWeek.total) {
			highestWeek = payout;
		}
	}

	// Sort by date descending
	weeklyPayouts.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

	const averageWeekly = weeklyPayouts.length > 0 ? totalPayout / weeklyPayouts.length : 0;

	return {
		payouts: {
			weekly_payouts: weeklyPayouts,
			summary: {
				total_payout: totalPayout,
				average_weekly: averageWeekly,
				highest_week: highestWeek?.week || '',
				weeks: weeklyPayouts.length
			},
			date_range: {
				start: start || '',
				end: end || ''
			}
		}
	};
};
