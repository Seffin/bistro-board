import { db } from '$lib/server/db';
import { orders, expenses, income_register } from '$lib/server/db/schema';
import { getAllChannels } from '$lib/server/config';
import { between, and, eq, ilike, gte, lte } from 'drizzle-orm';
import { getCached } from '$lib/server/cache';
import { parseDateRange } from '$lib/utils/date-filter';

export async function load({ url }: { url?: URL } = {}) {
	const { start, end } = parseDateRange(url);
	const channel = url?.searchParams.get('channel');

	const cacheKey = `dashboard:${start || 'all'}:${end || 'all'}:${channel || 'all'}`;

	return getCached(cacheKey, async () => {
		const activeChannels = await getAllChannels();

		const orderConditions = [];
		if (start && end) {
			orderConditions.push(
				between(orders.order_date, new Date(`${start}T00:00:00Z`), new Date(`${end}T23:59:59Z`))
			);
		}

		// Determine the selected channel for filtering
		let selectedChannelName: string | null = null;
		if (channel && channel !== 'all') {
			const activeChannel = activeChannels.find((c) => c.id === channel);
			if (activeChannel) {
				selectedChannelName = activeChannel.name;
				orderConditions.push(ilike(orders.channel, activeChannel.name));
			}
		}

		const allOrders = await db
			.select({
				channel: orders.channel,
				status: orders.status,
				grand_total: orders.grand_total,
				net_payout: orders.net_payout,
				order_date: orders.order_date,
				discount: orders.discount
			})
			.from(orders)
			.where(orderConditions.length > 0 ? and(...orderConditions) : undefined);

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
		let totalExpense = 0;

		// Order status tracking
		const statusCounts: Record<string, number> = {};

		// Per-channel accumulation map
		const channelStats: Record<string, { grossSales: number; orderCount: number; aov: number }> =
			{};
		for (const c of activeChannels) {
			channelStats[c.name.toLowerCase()] = { grossSales: 0, orderCount: 0, aov: 0 };
		}

		// Monthly accumulation map for charts: YYYY-MM -> { channelKey: amount, total: amount, expenses: amount }
		const monthlyGroups: Record<string, Record<string, number>> = {};
		// Track per-month order counts and per-channel revenue for drill-down
		const monthlyOrderCounts: Record<string, number> = {};
		const monthlyChannelRevenue: Record<string, Record<string, number>> = {};
		const monthlyExpenseCategories: Record<string, Record<string, number>> = {};

		// Hourly velocity map (11:00 to 22:00)
		const hourlyVolume: Record<string, number> = {
			'11:00': 0,
			'12:00': 0,
			'13:00': 0,
			'14:00': 0,
			'15:00': 0,
			'16:00': 0,
			'17:00': 0,
			'18:00': 0,
			'19:00': 0,
			'20:00': 0,
			'21:00': 0,
			'22:00': 0
		};

		// Weekly performance map (Mon to Sun)
		const weeklyRevenue: Record<string, number> = {
			Mon: 0,
			Tue: 0,
			Wed: 0,
			Thu: 0,
			Fri: 0,
			Sat: 0,
			Sun: 0
		};
		const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

		for (const order of allOrders) {
			totalOrders++;
			const status = (order.status || 'unknown').toLowerCase();

			// Track order status for donut chart
			const statusKey = status.charAt(0).toUpperCase() + status.slice(1);
			statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;

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

					// Per-month order counts and channel revenue for drill-down
					monthlyOrderCounts[monthKey] = (monthlyOrderCounts[monthKey] || 0) + 1;
					if (!monthlyChannelRevenue[monthKey]) monthlyChannelRevenue[monthKey] = {};
					monthlyChannelRevenue[monthKey][cKey] = (monthlyChannelRevenue[monthKey][cKey] || 0) + gross;
				}
			}
		}

		// Expense monthly grouping & category breakdown
		const expenseCategories: Record<string, number> = {};

		for (const exp of allExpenses) {
			const amount = exp.amount || 0;
			totalExpense += amount;
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

			// Per-month expense category for drill-down
			if (!monthlyExpenseCategories[monthKey]) monthlyExpenseCategories[monthKey] = {};
			monthlyExpenseCategories[monthKey][cat] = (monthlyExpenseCategories[monthKey][cat] || 0) + amount;
		}

		// Calculate Net Profit using the Business Ledger exact formula & data source
		const incomeRecords = await db
			.select()
			.from(income_register)
			.where(
				start && end
					? and(gte(income_register.date, start), lte(income_register.date, end))
					: undefined
			);

		let ledgerTotalIncome = 0;
		for (const record of incomeRecords) {
			const counter = record.petpooja_net || 0;
			const swiggy = record.swiggy_payout || 0;
			const zomato = record.zomato_payout || 0;
			const total = record.total_income || 0;

			if (selectedChannelName) {
				const nameLower = selectedChannelName.toLowerCase();
				if (nameLower === 'counter' || nameLower === 'petpooja') ledgerTotalIncome += counter;
				else if (nameLower === 'swiggy') ledgerTotalIncome += swiggy;
				else if (nameLower === 'zomato') ledgerTotalIncome += zomato;
				else ledgerTotalIncome += total; // fallback if channel unknown
			} else {
				ledgerTotalIncome += total;
			}
		}

		const netProfit = ledgerTotalIncome - totalExpense;

		// Calculate AOV
		for (const key in channelStats) {
			const stats = channelStats[key];
			stats.aov = stats.orderCount > 0 ? stats.grossSales / stats.orderCount : 0;
		}

		const revenueRetainedPct = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
		const successRatePct = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;

		// Prepare Chart Data
		const sortedMonths = Object.keys(monthlyGroups).sort();
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		const categories = sortedMonths.map((m) => {
			const [y, mo] = m.split('-');
			return `${monthNames[parseInt(mo, 10) - 1]} ${y}`;
		});

		// Determine which channels to include in charts based on filter
		const chartChannels = selectedChannelName
			? activeChannels.filter((c) => c.name.toLowerCase() === selectedChannelName.toLowerCase())
			: activeChannels;

		const revenueTrendSeries = chartChannels.map((c) => {
			const cKey = c.name.toLowerCase();
			return {
				name: c.name,
				color: c.color,
				data: sortedMonths.map((m) => Number(((monthlyGroups[m][cKey] || 0) / 100000).toFixed(2)))
			};
		});

		// Only add Total line when showing all channels
		if (!selectedChannelName) {
			revenueTrendSeries.push({
				name: 'Total',
				color: '#6366f1',
				data: sortedMonths.map((m) => Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2)))
			});
		}

		const channelMixSeries = chartChannels.map((c) => {
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
				data: sortedMonths.map((m) =>
					Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2))
				)
			},
			{
				name: 'Expenses',
				type: 'column',
				data: sortedMonths.map((m) =>
					Number(((monthlyGroups[m].expenses || 0) / 100000).toFixed(2))
				)
			},
			{
				name: 'Profit',
				type: 'line',
				data: sortedMonths.map((m) =>
					Number(
						(
							((monthlyGroups[m]['total'] || 0) - (monthlyGroups[m].expenses || 0)) /
							100000
						).toFixed(2)
					)
				)
			}
		];

		const expenseLabels = Object.keys(expenseCategories);
		const expenseSeries = expenseLabels.map((cat) =>
			Number((expenseCategories[cat] / 100000).toFixed(2))
		);

		const averageTicketSize = successfulOrders > 0 ? totalGross / successfulOrders : 0;

		// Order Status Distribution
		const statusLabels = Object.keys(statusCounts);
		const statusSeries = statusLabels.map((k) => statusCounts[k]);
		const statusColors = statusLabels.map((label) => {
			const key = label.toLowerCase();
			if (key === 'delivered' || key === 'completed') return '#10b981';
			if (key === 'cancelled') return '#ef4444';
			if (key === 'failed') return '#f97316';
			if (key === 'pending') return '#f59e0b';
			return '#6b7280';
		});

		return {
			kpis: {
				totalIncome: ledgerTotalIncome,
				grossRevenue: totalGross,
				netPayout: totalNet,
				totalExpense,
				netProfit,
				revenueRetainedPct,
				totalVolume: successfulOrders,
				successRatePct,
				averageTicketSize,
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
					labels: chartChannels.map((c) => c.name),
					series: chartChannels.map((c) =>
						Number(((channelStats[c.name.toLowerCase()]?.grossSales || 0) / 100000).toFixed(2))
					),
					colors: chartChannels.map((c) => c.color)
				},
				orderStatus: {
					labels: statusLabels,
					series: statusSeries,
					colors: statusColors
				}
			},
			// Monthly summary table data
			monthlySummary: sortedMonths.map((m) => {
				const [y, mo] = m.split('-');
				return {
					monthKey: m,
					label: `${monthNames[parseInt(mo, 10) - 1]} ${y}`,
					revenue: Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2)),
					expenses: Number(((monthlyGroups[m].expenses || 0) / 100000).toFixed(2)),
					profit: Number((((monthlyGroups[m]['total'] || 0) - (monthlyGroups[m].expenses || 0)) / 100000).toFixed(2)),
					orders: monthlyOrderCounts[m] || 0
				};
			}),
			// Per-month drill-down details
			monthlyDetails: Object.fromEntries(
				sortedMonths.map((m) => {
					const [y, mo] = m.split('-');
					return [
						m,
						{
							label: `${monthNames[parseInt(mo, 10) - 1]} ${y}`,
							revenueTotal: Number(((monthlyGroups[m]['total'] || 0) / 100000).toFixed(2)),
							expenseTotal: Number(((monthlyGroups[m].expenses || 0) / 100000).toFixed(2)),
							profit: Number((((monthlyGroups[m]['total'] || 0) - (monthlyGroups[m].expenses || 0)) / 100000).toFixed(2)),
							orders: monthlyOrderCounts[m] || 0,
							channels: Object.fromEntries(
								activeChannels.map((c) => [
									c.name,
									Number(((monthlyChannelRevenue[m]?.[c.name.toLowerCase()] || 0) / 100000).toFixed(2))
								])
							),
							expenseCategories: Object.fromEntries(
								Object.entries(monthlyExpenseCategories[m] || {}).map(([cat, amt]) => [
									cat,
									Number((amt / 100000).toFixed(2))
								])
							)
						}
					];
				})
			)
		};
	}); // end getCached
}

export const actions = {
	sync: async () => {
		// Mock external ETL sync process or call seed/migration logic
		return { success: true, message: 'Data sync completed successfully' };
	}
};
