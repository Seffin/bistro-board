import { db } from '$lib/server/db';
import { orders, expenses } from '$lib/server/db/schema';
import { getAllChannels } from '$lib/server/config';
import { between } from 'drizzle-orm';
import { getCached } from '$lib/server/cache';
import { parseDateRange } from '$lib/utils/date-filter';

export async function load({ url }: { url?: URL } = {}) {
	const { start, end } = parseDateRange(url);

	const cacheKey = `dashboard:${start || 'all'}:${end || 'all'}`;

	return getCached(cacheKey, async () => {
	const activeChannels = await getAllChannels();

	const allOrders =
		start && end
			? await db
					.select({
						channel: orders.channel,
						status: orders.status,
						grand_total: orders.grand_total,
						net_payout: orders.net_payout,
						order_date: orders.order_date
					})
					.from(orders)
					.where(between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`)))
			: await db
					.select({
						channel: orders.channel,
						status: orders.status,
						grand_total: orders.grand_total,
						net_payout: orders.net_payout,
						order_date: orders.order_date
					})
					.from(orders);

	const allExpenses =
		start && end
			? await db
					.select({
						date: expenses.date,
						month: expenses.month,
						year: expenses.year,
						category: expenses.category,
						amount: expenses.amount
					})
					.from(expenses)
					.where(between(expenses.date, start, end))
			: await db
					.select({
						date: expenses.date,
						month: expenses.month,
						year: expenses.year,
						category: expenses.category,
						amount: expenses.amount
					})
					.from(expenses);

	let totalGross = 0;
	let totalNet = 0;
	let totalOrders = 0;
	let successfulOrders = 0;

	// Per-channel accumulation map
	const channelStats: Record<string, { grossSales: number; orderCount: number; aov: number }> = {};
	for (const c of activeChannels) {
		channelStats[c.name.toLowerCase()] = { grossSales: 0, orderCount: 0, aov: 0 };
	}

	// Monthly accumulation map for charts: YYYY-MM -> { channelKey: amount, total: amount, expenses: amount }
	const monthlyGroups: Record<string, Record<string, number>> = {};

	// Hourly velocity map (11:00 to 22:00)
	const hourlyVolume: Record<string, number> = {
		'11:00': 0, '12:00': 0, '13:00': 0, '14:00': 0, '15:00': 0, '16:00': 0,
		'17:00': 0, '18:00': 0, '19:00': 0, '20:00': 0, '21:00': 0, '22:00': 0
	};

	// Weekly performance map (Mon to Sun)
	const weeklyRevenue: Record<string, number> = {
		'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
	};
	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	for (const order of allOrders) {
		totalOrders++;
		const status = (order.status || '').toLowerCase();
		const isCancelled = status === 'cancelled' || status === 'failed';

		if (!isCancelled) {
			successfulOrders++;
			const gross = order.grand_total || 0;
			const net = order.net_payout || 0;
			totalGross += gross;
			totalNet += net;

			const cKey = (order.channel || '').toLowerCase();
			if (channelStats[cKey]) {
				channelStats[cKey].grossSales += gross;
				channelStats[cKey].orderCount++;
			} else {
				channelStats[cKey] = { grossSales: gross, orderCount: 1, aov: 0 };
			}

			if (order.order_date) {
				const dateObj = new Date(order.order_date);

				// Hourly Velocity
				const hour = dateObj.getUTCHours();
				const hourStr = `${String(hour).padStart(2, '0')}:00`;
				if (hourlyVolume[hourStr] !== undefined) {
					hourlyVolume[hourStr]++;
				}

				// Weekly Performance
				const dayIndex = dateObj.getUTCDay();
				const dayName = weekDays[dayIndex];
				if (weeklyRevenue[dayName] !== undefined) {
					weeklyRevenue[dayName] += gross;
				}

				// Group monthly
				const year = dateObj.getFullYear();
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				const monthKey = `${year}-${month}`;

				if (!monthlyGroups[monthKey]) {
					monthlyGroups[monthKey] = { total: 0, expenses: 0 };
					for (const c of activeChannels) {
						monthlyGroups[monthKey][c.name.toLowerCase()] = 0;
					}
				}
				monthlyGroups[monthKey][cKey] = (monthlyGroups[monthKey][cKey] || 0) + gross;
				monthlyGroups[monthKey]['total'] += gross;
			}
		}
	}

	// Expense monthly grouping & category breakdown
	const expenseCategories: Record<string, number> = {};

	for (const exp of allExpenses) {
		const amount = exp.amount || 0;
		let monthKey = '';
		if (exp.date) {
			const match = exp.date.match(/^(\d{4}-\d{2})/);
			if (match) {
				monthKey = match[1];
			}
		}
		if (!monthKey && exp.year && exp.month) {
			const mNum = !isNaN(Number(exp.month)) ? String(exp.month).padStart(2, '0') : '01';
			monthKey = `${exp.year}-${mNum}`;
		}
		if (!monthKey) {
			monthKey = '2026-01';
		}

		if (!monthlyGroups[monthKey]) {
			monthlyGroups[monthKey] = { total: 0, expenses: 0 };
			for (const c of activeChannels) {
				monthlyGroups[monthKey][c.name.toLowerCase()] = 0;
			}
		}
		monthlyGroups[monthKey].expenses = (monthlyGroups[monthKey].expenses || 0) + amount;

		const cat = exp.category || 'Uncategorized';
		expenseCategories[cat] = (expenseCategories[cat] || 0) + amount;
	}

	// Calculate AOV
	for (const key in channelStats) {
		const stats = channelStats[key];
		stats.aov = stats.orderCount > 0 ? stats.grossSales / stats.orderCount : 0;
	}

	const revenueRetainedPct = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
	const successRatePct = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;

	// Prepare Chart Data
	const sortedMonths = Object.keys(monthlyGroups).sort();
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const categories = sortedMonths.map((m) => {
		const [y, mo] = m.split('-');
		return `${monthNames[parseInt(mo, 10) - 1]} ${y}`;
	});

	const revenueTrendSeries = activeChannels.map((c) => {
		const cKey = c.name.toLowerCase();
		return {
			name: c.name,
			color: c.color,
			data: sortedMonths.map((m) => Number(((monthlyGroups[m][cKey] || 0) / 100000).toFixed(2)))
		};
	});

	revenueTrendSeries.push({
		name: 'Total',
		color: '#6366f1',
		data: sortedMonths.map((m) => Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2)))
	});

	const channelMixSeries = activeChannels.map((c) => {
		const cKey = c.name.toLowerCase();
		return {
			name: c.name,
			color: c.color,
			data: sortedMonths.map((m) => Number(((monthlyGroups[m][cKey] || 0) / 100000).toFixed(2)))
		};
	});

	const pnlSeries = [
		{
			name: 'Revenue',
			type: 'column',
			data: sortedMonths.map((m) => Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2)))
		},
		{
			name: 'Expenses',
			type: 'column',
			data: sortedMonths.map((m) => Number(((monthlyGroups[m].expenses || 0) / 100000).toFixed(2)))
		},
		{
			name: 'Profit',
			type: 'line',
			data: sortedMonths.map((m) =>
				Number((((monthlyGroups[m]['total'] || 0) - (monthlyGroups[m].expenses || 0)) / 100000).toFixed(2))
			)
		}
	];

	const expenseLabels = Object.keys(expenseCategories);
	const expenseSeries = expenseLabels.map((cat) => Number((expenseCategories[cat] / 100000).toFixed(2)));

	return {
		kpis: {
			netPayout: totalNet,
			revenueRetainedPct,
			totalVolume: successfulOrders,
			successRatePct,
			channelStats
		},
		charts: {
			revenueTrends: {
				categories,
				series: revenueTrendSeries
			},
			channelMix: {
				categories,
				series: channelMixSeries
			},
			pnlTrends: {
				categories,
				series: pnlSeries
			},
			expenseBreakdown: {
				labels: expenseLabels,
				series: expenseSeries
			},
			hourlyVelocity: {
				categories: Object.keys(hourlyVolume),
				series: [{ name: 'Order Volume', data: Object.values(hourlyVolume) }]
			},
			weeklyPerformance: {
				categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
				series: [
					{
						name: 'Revenue',
						data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) =>
							Number((weeklyRevenue[d] / 100000).toFixed(2))
						)
					}
				]
			},
			monthlyContribution: {
				labels: activeChannels.map((c) => c.name),
				series: activeChannels.map((c) =>
					Number(((channelStats[c.name.toLowerCase()]?.grossSales || 0) / 100000).toFixed(2))
				),
				colors: activeChannels.map((c) => c.color)
			}
		}
	};
	}); // end getCached
}

export const actions = {
	sync: async () => {
		// Mock external ETL sync process or call seed/migration logic
		return { success: true, message: 'Data sync completed successfully' };
	}
};
